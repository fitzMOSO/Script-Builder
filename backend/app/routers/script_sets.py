from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Objection, ObjectionQuestion, Rebuttal, ScriptSet, ScriptSetVersion, ScriptStep
from app.schemas import (
    ReorderRequest,
    ScriptSetCreate,
    ScriptSetRead,
    ScriptSetSummary,
    ScriptSetUpdate,
    ScriptStepCreate,
    ScriptStepRead,
    ScriptStepUpdate,
    ScriptVersionRead,
    ScriptVersionSummary,
)

router = APIRouter(prefix="/api/script-sets", tags=["script-sets"])


def _get_set(db: Session, set_id: int) -> ScriptSet:
    script_set = db.get(ScriptSet, set_id)
    if script_set is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Script set not found")
    return script_set


def _get_step(db: Session, set_id: int, step_id: int) -> ScriptStep:
    step = db.get(ScriptStep, step_id)
    if step is None or step.script_set_id != set_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Step not found")
    return step


def _get_version(db: Session, set_id: int, version_id: int) -> ScriptSetVersion:
    version = db.get(ScriptSetVersion, version_id)
    if version is None or version.script_set_id != set_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")
    return version


def _snapshot(script_set: ScriptSet) -> dict:
    """Freeze a set's content as plain JSON.

    Steps are keyed by position, and objections reference that position rather
    than a step id, so a restore still lines up after the live steps have been
    deleted and recreated with new ids.
    """
    positions = {step.id: index for index, step in enumerate(script_set.steps)}
    return {
        "description": script_set.description,
        "variable_values": dict(script_set.variable_values or {}),
        "steps": [
            {
                "title": step.title,
                "statement_no": step.statement_no,
                "content": step.content,
                "notes": step.notes,
                "category": step.category,
                "is_required": step.is_required,
                "allow_skip": step.allow_skip,
            }
            for step in script_set.steps
        ],
        "objections": [
            {
                "title": objection.title,
                "severity": objection.severity,
                "step_index": positions.get(objection.step_id),
                "questions": [q.text for q in objection.questions],
                "rebuttals": [r.text for r in objection.rebuttals],
            }
            for objection in script_set.objections
        ],
    }


def _renumber(script_set: ScriptSet) -> None:
    for index, step in enumerate(sorted(script_set.steps, key=lambda s: s.position)):
        step.position = index


@router.get("", response_model=list[ScriptSetSummary])
def list_script_sets(db: Session = Depends(get_db)) -> list[ScriptSet]:
    return list(db.scalars(select(ScriptSet).order_by(ScriptSet.updated_at.desc())))


@router.post("", response_model=ScriptSetRead, status_code=status.HTTP_201_CREATED)
def create_script_set(payload: ScriptSetCreate, db: Session = Depends(get_db)) -> ScriptSet:
    script_set = ScriptSet(**payload.model_dump())
    db.add(script_set)
    db.commit()
    db.refresh(script_set)
    return script_set


@router.get("/{set_id}", response_model=ScriptSetRead)
def get_script_set(set_id: int, db: Session = Depends(get_db)) -> ScriptSet:
    return _get_set(db, set_id)


@router.patch("/{set_id}", response_model=ScriptSetRead)
def update_script_set(
    set_id: int, payload: ScriptSetUpdate, db: Session = Depends(get_db)
) -> ScriptSet:
    script_set = _get_set(db, set_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(script_set, field, value)
    db.commit()
    db.refresh(script_set)
    return script_set


@router.post("/{set_id}/publish", response_model=ScriptSetRead)
def publish_script_set(set_id: int, db: Session = Depends(get_db)) -> ScriptSet:
    script_set = _get_set(db, set_id)
    if not script_set.steps:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot publish a script set with no steps")
    script_set.status = "published"
    script_set.version += 1
    # Freeze what is being published, so a later edit to the live set cannot
    # silently change what agents were told to read at this version.
    script_set.versions.append(
        ScriptSetVersion(
            version=script_set.version,
            name=script_set.name,
            snapshot=_snapshot(script_set),
        )
    )
    db.commit()
    db.refresh(script_set)
    return script_set


@router.get("/{set_id}/versions", response_model=list[ScriptVersionSummary])
def list_versions(set_id: int, db: Session = Depends(get_db)) -> list[ScriptSetVersion]:
    return _get_set(db, set_id).versions


@router.get("/{set_id}/versions/{version_id}", response_model=ScriptVersionRead)
def get_version(set_id: int, version_id: int, db: Session = Depends(get_db)) -> ScriptSetVersion:
    return _get_version(db, set_id, version_id)


@router.post("/{set_id}/versions/{version_id}/restore", response_model=ScriptSetRead)
def restore_version(set_id: int, version_id: int, db: Session = Depends(get_db)) -> ScriptSet:
    """Replace the live steps and objections with a snapshot's contents.

    The set drops back to draft: restoring rewrites content, so republishing is
    what should mint the next version rather than this call.
    """
    script_set = _get_set(db, set_id)
    version = _get_version(db, set_id, version_id)
    snapshot = version.snapshot or {}

    script_set.objections.clear()
    script_set.steps.clear()
    db.flush()

    steps = [
        ScriptStep(
            title=data.get("title", "Untitled"),
            statement_no=data.get("statement_no", 1),
            content=data.get("content", ""),
            notes=data.get("notes"),
            category=data.get("category", "Opening"),
            is_required=data.get("is_required", True),
            allow_skip=data.get("allow_skip", False),
            position=index,
        )
        for index, data in enumerate(snapshot.get("steps", []))
    ]
    script_set.steps.extend(steps)
    db.flush()  # assigns step ids, needed to re-link the objections below

    for index, data in enumerate(snapshot.get("objections", [])):
        step_index = data.get("step_index")
        script_set.objections.append(
            Objection(
                title=data.get("title", "Untitled"),
                severity=data.get("severity", "MAJOR"),
                step_id=steps[step_index].id if step_index is not None and step_index < len(steps) else None,
                position=index,
                questions=[
                    ObjectionQuestion(text=text, position=i)
                    for i, text in enumerate(data.get("questions", []))
                ],
                rebuttals=[
                    Rebuttal(text=text, position=i)
                    for i, text in enumerate(data.get("rebuttals", []))
                ],
            )
        )

    if "variable_values" in snapshot:
        script_set.variable_values = snapshot["variable_values"]
    script_set.status = "draft"

    db.commit()
    db.refresh(script_set)
    return script_set


@router.delete("/{set_id}/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_version(set_id: int, version_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get_version(db, set_id, version_id))
    db.commit()


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_script_set(set_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get_set(db, set_id))
    db.commit()


@router.post("/{set_id}/steps", response_model=ScriptStepRead, status_code=status.HTTP_201_CREATED)
def create_step(
    set_id: int, payload: ScriptStepCreate, db: Session = Depends(get_db)
) -> ScriptStep:
    script_set = _get_set(db, set_id)
    step = ScriptStep(**payload.model_dump(), position=len(script_set.steps))
    script_set.steps.append(step)
    db.commit()
    db.refresh(step)
    return step


@router.patch("/{set_id}/steps/{step_id}", response_model=ScriptStepRead)
def update_step(
    set_id: int, step_id: int, payload: ScriptStepUpdate, db: Session = Depends(get_db)
) -> ScriptStep:
    step = _get_step(db, set_id, step_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(step, field, value)
    db.commit()
    db.refresh(step)
    return step


@router.post("/{set_id}/steps/{step_id}/duplicate", response_model=ScriptStepRead)
def duplicate_step(set_id: int, step_id: int, db: Session = Depends(get_db)) -> ScriptStep:
    script_set = _get_set(db, set_id)
    source = _get_step(db, set_id, step_id)
    clone = ScriptStep(
        title=f"{source.title} (copy)",
        statement_no=source.statement_no,
        content=source.content,
        notes=source.notes,
        category=source.category,
        is_required=source.is_required,
        allow_skip=source.allow_skip,
        position=source.position + 1,
    )
    for step in script_set.steps:
        if step.position > source.position:
            step.position += 1
    script_set.steps.append(clone)
    db.flush()
    _renumber(script_set)
    db.commit()
    db.refresh(clone)
    return clone


@router.delete("/{set_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_step(set_id: int, step_id: int, db: Session = Depends(get_db)) -> None:
    script_set = _get_set(db, set_id)
    step = _get_step(db, set_id, step_id)
    # The FK has no ON DELETE action (MSSQL rejects the second cascade path),
    # so unpin any objection attached to this step before removing it.
    for objection in script_set.objections:
        if objection.step_id == step_id:
            objection.step_id = None
    db.flush()
    script_set.steps.remove(step)
    db.flush()
    _renumber(script_set)
    db.commit()


@router.post("/{set_id}/steps/reorder", response_model=ScriptSetRead)
def reorder_steps(
    set_id: int, payload: ReorderRequest, db: Session = Depends(get_db)
) -> ScriptSet:
    script_set = _get_set(db, set_id)
    by_id = {step.id: step for step in script_set.steps}
    if set(payload.step_ids) != set(by_id):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "step_ids must contain every step in this set exactly once"
        )
    for index, step_id in enumerate(payload.step_ids):
        by_id[step_id].position = index
    db.commit()
    db.refresh(script_set)
    return script_set
