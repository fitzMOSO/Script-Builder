"""Seed the Script Builder database with demo script sets.

All seed content comes from scripts/sample_sets.py and is invented demo
material — it is not transcribed from any real campaign. The sets exist so the
library, the set switcher and the run view have something to work with on a
fresh database.

Placeholders are written in the app's {{merge_variable}} syntax so the Run
screen demonstrates substitution.

Running this script WIPES all existing script data and reseeds from scratch,
so ids start at 1 again.
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


def reset(db) -> None:
    """Delete every row so the next insert starts from id 1 again.

    An `INTEGER PRIMARY KEY` in SQLite is an alias for the table's rowid, and
    without the `AUTOINCREMENT` keyword the next rowid is simply `max(rowid)+1`
    — so clearing the table is all it takes to restart numbering. There is no
    counter to reset, which is why this needs none of the `DBCC CHECKIDENT`
    dance SQL Server required.

    `sqlite_sequence` is still swept, defensively: it only exists once some
    table has been declared AUTOINCREMENT, and a stale row in it would pin ids
    above 1 for that table. Missing table is fine — nothing declares it today.

    Ids now start at 1 rather than 0. Nothing keys off a literal id, so this is
    only visible in URLs.
    """
    for table in TABLES_IN_DELETE_ORDER:
        db.execute(text(f"DELETE FROM {table}"))  # noqa: S608 - fixed list above
    db.flush()

    has_sequence = db.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
    ).scalar()
    if has_sequence:
        for table in TABLES_IN_DELETE_ORDER:
            db.execute(
                text("DELETE FROM sqlite_sequence WHERE name = :table"), {"table": table}
            )

    print(f"reset   cleared {len(TABLES_IN_DELETE_ORDER)} tables, next id will be 1")


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
