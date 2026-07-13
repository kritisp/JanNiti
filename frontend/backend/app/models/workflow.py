from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class WorkflowRun(Base, TimestampMixin):
    """Tracks a full coordinated Agentic Workflow execution session."""

    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    trigger_type: Mapped[str] = mapped_column(
        String, default="Citizen Submission", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String, default="Pending", nullable=False
    )  # Pending, Running, Completed, Failed
    
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    execution_time_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    task_logs: Mapped[List["AgentTaskLog"]] = relationship(
        "AgentTaskLog", back_populates="run", cascade="all, delete-orphan"
    )


class AgentTaskLog(Base, TimestampMixin):
    """Logs the lifecycle details of a single agent executing inside a Workflow."""

    __tablename__ = "agent_task_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        String, ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False
    )
    agent_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String, default="Pending", nullable=False
    )  # Pending, Running, Completed, Failed

    input_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON Stringified
    output_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON Stringified
    
    execution_time_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    run: Mapped["WorkflowRun"] = relationship("WorkflowRun", back_populates="task_logs")
