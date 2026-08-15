"""Seed the Script Builder database with demo script sets.

All seed content comes from scripts/sample_sets.py and is invented demo
material — it is not transcribed from any real campaign. The sets exist so the
library, the set switcher and the run view have something to work with on a
fresh database.

Placeholders are written in the app's {{merge_variable}} syntax so the Run
screen demonstrates substitution.

Running this script WIPES all existing script data and reseeds from scratch,
reseeding IDENTITY columns so ids start at 1.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Objection,
    ObjectionQuestion,
    Rebuttal,
    ScriptSet,
    ScriptSetVersion,
    ScriptStep,
)
from app.routers.script_sets import _snapshot as snapshot_of  # noqa: E402
from scripts.sample_sets import SAMPLE_SETS  # noqa: E402

# Child tables first — FK order matters for the delete sweep.
TABLES_IN_DELETE_ORDER = [
    "rebuttals",
    "objection_questions",
    "objections",
    "script_set_versions",
    "script_steps",
    "script_sets",
]


VIRGIN_CHECK = text(
    """
    SELECT CASE WHEN last_value IS NULL THEN 1 ELSE 0 END
    FROM sys.identity_columns
    WHERE object_id = OBJECT_ID(:table_name)
    """
)


def reset(db) -> None:
    """Delete every row and reseed IDENTITY so the first new row gets id 0.

    SQL Server's RESEED has two different behaviours, and getting this wrong is
    why a re-run would otherwise start at 1 instead of 0:

      * table that has NEVER had a row inserted -> next id = reseed_value
      * table that HAS had rows                 -> next id = reseed_value + 1

    `sys.identity_columns.last_value` is NULL only in the first case, so we use
    it to pick the right reseed value and land on 0 either way.
    """
    for table in TABLES_IN_DELETE_ORDER:
        db.execute(text(f"DELETE FROM {table}"))
    db.flush()

    for table in TABLES_IN_DELETE_ORDER:
        is_virgin = db.execute(VIRGIN_CHECK, {"table_name": table}).scalar()
        reseed_value = 0 if is_virgin else -1
        db.execute(text(f"DBCC CHECKIDENT ('{table}', RESEED, {reseed_value})"))

    print(f"reset   cleared {len(TABLES_IN_DELETE_ORDER)} tables, next id will be 0")


def build_set(spec: dict, steps: list, objections: list) -> ScriptSet:
    """Assemble one ScriptSet with its ordered steps and objections."""
    script_set = ScriptSet(**spec)

    for position, (statement_no, title, category, required, skip, content) in enumerate(steps):
        script_set.steps.append(
            ScriptStep(
                title=title,
                statement_no=statement_no,
                content=content,
                category=category,
                is_required=required,
                allow_skip=skip,
                position=position,
            )
        )

    for position, (severity, title, questions, rebuttals) in enumerate(objections):
        script_set.objections.append(
            Objection(
                severity=severity,
                title=title,
                position=position,
                questions=[ObjectionQuestion(text=q, position=i) for i, q in enumerate(questions)],
                rebuttals=[Rebuttal(text=r, position=i) for i, r in enumerate(rebuttals)],
            )
        )

    return script_set


def main() -> None:
    specs = [
        (entry["set"], entry["steps"], entry["objections"]) for entry in SAMPLE_SETS
    ]

    with SessionLocal() as db:
        reset(db)

        for spec, steps, objections in specs:
            script_set = build_set(spec, steps, objections)
            db.add(script_set)
            db.flush()

            # Published sets get a matching v1 snapshot, so the Versions panel
            # isn't empty until someone happens to press Publish.
            if script_set.status == "published":
                script_set.versions.append(
                    ScriptSetVersion(
                        version=script_set.version,
                        name=script_set.name,
                        note="Initial seeded version",
                        snapshot=snapshot_of(script_set),
                    )
                )
                db.flush()

            questions = sum(len(o[2]) for o in objections)
            rebuttals = sum(len(o[3]) for o in objections)
            print(f"seed    {script_set.name!r} (id={script_set.id})")
            print(f"        {len(steps)} steps")
            print(f"        {len(objections)} objections, {questions} questions, "
                  f"{rebuttals} rebuttals")

        db.commit()
        print(f"seed    {len(specs)} script sets total")
        print("\nDone.")


if __name__ == "__main__":
    main()
