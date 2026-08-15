from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Objection, ObjectionQuestion, Rebuttal, ScriptSet
from app.schemas import ObjectionCreate, ObjectionRead, ObjectionUpdate

router = APIRouter(prefix="/api/script-sets/{set_id}/objections", tags=["objections"])


def _get_set(db: Session, set_id: int) -> ScriptSet:
    script_set = db.get(ScriptSet, set_id)
    if script_set is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Script set not found")
    return script_set


def _get_objection(db: Session, set_id: int, objection_id: int) -> Objection:
    objection = db.get(Objection, objection_id)
    if objection is None or objection.script_set_id != set_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Objection not found")
    return objection


@router.get("", response_model=list[ObjectionRead])
def list_objections(set_id: int, db: Session = Depends(get_db)) -> list[Objection]:
    _get_set(db, set_id)
    return list(
        db.scalars(
            select(Objection).where(Objection.script_set_id == set_id).order_by(Objection.position)
        )
    )


@router.post("", response_model=ObjectionRead, status_code=status.HTTP_201_CREATED)
def create_objection(
    set_id: int, payload: ObjectionCreate, db: Session = Depends(get_db)
) -> Objection:
    script_set = _get_set(db, set_id)
    objection = Objection(
        title=payload.title,
        severity=payload.severity,
        step_id=payload.step_id,
        position=len(script_set.objections),
        questions=[
            ObjectionQuestion(text=text, position=i) for i, text in enumerate(payload.questions)
        ],
        rebuttals=[Rebuttal(text=text, position=i) for i, text in enumerate(payload.rebuttals)],
    )
    script_set.objections.append(objection)
    db.commit()
    db.refresh(objection)
    return objection


@router.patch("/{objection_id}", response_model=ObjectionRead)
def update_objection(
    set_id: int, objection_id: int, payload: ObjectionUpdate, db: Session = Depends(get_db)
) -> Objection:
    objection = _get_objection(db, set_id, objection_id)
    data = payload.model_dump(exclude_unset=True)

    if "questions" in data:
        objection.questions = [
            ObjectionQuestion(text=text, position=i) for i, text in enumerate(data.pop("questions"))
        ]
    if "rebuttals" in data:
        objection.rebuttals = [
            Rebuttal(text=text, position=i) for i, text in enumerate(data.pop("rebuttals"))
        ]
    for field, value in data.items():
        setattr(objection, field, value)

    db.commit()
    db.refresh(objection)
    return objection


@router.delete("/{objection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_objection(set_id: int, objection_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get_objection(db, set_id, objection_id))
    db.commit()
