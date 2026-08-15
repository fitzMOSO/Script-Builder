import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.objection import ObjectionRead

VARIABLE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")

CATEGORIES = [
    "Opening",
    "Introduction",
    "Purpose",
    "Presentation",
    "Probing",
    "Offer",
    "Enrollment",
    "Declaration",
    "Close",
    "Objection",
]

SEVERITIES = ["MAJOR", "MINOR"]


def extract_variables(content: str) -> list[str]:
    seen: dict[str, None] = {}
    for match in VARIABLE_PATTERN.finditer(content or ""):
        seen.setdefault(match.group(1), None)
    return list(seen)


class ScriptStepBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    statement_no: int = Field(default=1, ge=1)
    content: str = ""
    notes: str | None = None
    category: str = "Opening"
    is_required: bool = True
    allow_skip: bool = False


class ScriptStepCreate(ScriptStepBase):
    pass


class ScriptStepUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    statement_no: int | None = Field(default=None, ge=1)
    content: str | None = None
    notes: str | None = None
    category: str | None = None
    is_required: bool | None = None
    allow_skip: bool | None = None


class ScriptStepRead(ScriptStepBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    script_set_id: int
    position: int

    @computed_field
    @property
    def variables(self) -> list[str]:
        return extract_variables(self.content)


class ScriptSetBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ScriptSetCreate(ScriptSetBase):
    pass


class ScriptSetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = None
    variable_values: dict[str, str] | None = None


class ScriptSetSummary(ScriptSetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    version: int
    variable_values: dict[str, str] = {}
    created_at: datetime
    updated_at: datetime


class ScriptSetRead(ScriptSetSummary):
    steps: list[ScriptStepRead] = []
    objections: list[ObjectionRead] = []


class ReorderRequest(BaseModel):
    step_ids: list[int] = Field(min_length=1)


class ScriptVersionSummary(BaseModel):
    """List row — deliberately excludes the snapshot payload, which is large."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    script_set_id: int
    version: int
    name: str
    note: str | None = None
    created_at: datetime


class ScriptVersionRead(ScriptVersionSummary):
    snapshot: dict = {}
