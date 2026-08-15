from pydantic import BaseModel, ConfigDict, Field


class ObjectionQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    position: int


class RebuttalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    position: int


class ObjectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    script_set_id: int
    step_id: int | None = None
    severity: str
    title: str
    position: int
    questions: list[ObjectionQuestionRead] = []
    rebuttals: list[RebuttalRead] = []


class ObjectionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    severity: str = "MAJOR"
    step_id: int | None = None
    questions: list[str] = []
    rebuttals: list[str] = []


class ObjectionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    severity: str | None = None
    # `| None` is a real value here (unpin from the step), so callers must rely
    # on exclude_unset rather than on None meaning "leave alone".
    step_id: int | None = None
    questions: list[str] | None = None
    rebuttals: list[str] | None = None
