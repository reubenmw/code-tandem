"""
Taskmaster integration for parsing PRD and backlog.

This module provides functionality to parse prd.md and tasks.json
and create curriculum-backlog mappings.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass


@dataclass
class TaskmasterTask:
    """Represents a task from tasks.json."""

    id: str
    title: str
    description: str
    dependencies: List[str]
    status: str
    priority: Optional[str] = None
    tags: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "dependencies": self.dependencies,
            "status": self.status,
            "priority": self.priority,
            "tags": self.tags or [],
        }


@dataclass
class PRDSection:
    """Represents a section from the PRD."""

    title: str
    content: str
    level: int
    objectives: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "title": self.title,
            "content": self.content,
            "level": self.level,
            "objectives": self.objectives,
        }


class TaskmasterParser:
    """Parser for Taskmaster tasks.json files."""

    def parse_tasks_json(self, file_path: Union[str, Path]) -> List[TaskmasterTask]:
        """
        Parse a Taskmaster tasks.json file.

        Args:
            file_path: Path to tasks.json file

        Returns:
            List of TaskmasterTask objects

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If JSON is invalid or missing required fields
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Tasks file not found: {file_path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Handle different JSON structures
        # Could be: {"tasks": [...]} or just [...]
        if isinstance(data, dict):
            tasks_data = data.get("tasks", [])
        elif isinstance(data, list):
            tasks_data = data
        else:
            raise ValueError("Invalid tasks.json structure")

        tasks = []
        for task_data in tasks_data:
            # Validate required fields
            if "id" not in task_data:
                raise ValueError("Task missing 'id' field")

            task = TaskmasterTask(
                id=str(task_data["id"]),
                title=task_data.get("title", ""),
                description=task_data.get("description", ""),
                dependencies=task_data.get("dependencies", []),
                status=task_data.get("status", "pending"),
                priority=task_data.get("priority"),
                tags=task_data.get("tags"),
            )
            tasks.append(task)

        return tasks

    def filter_tasks(
        self,
        tasks: List[TaskmasterTask],
        status: Optional[str] = None,
        priority: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> List[TaskmasterTask]:
        """
        Filter tasks by various criteria.

        Args:
            tasks: List of tasks to filter
            status: Filter by status
            priority: Filter by priority
            tags: Filter by tags (tasks must have at least one matching tag)

        Returns:
            Filtered list of tasks
        """
        filtered = tasks

        if status:
            filtered = [t for t in filtered if t.status == status]

        if priority:
            filtered = [t for t in filtered if t.priority == priority]

        if tags:
            filtered = [
                t for t in filtered if t.tags and any(tag in t.tags for tag in tags)
            ]

        return filtered


class PRDParser:
    """Parser for Product Requirements Document (prd.md) files."""

    def parse_prd(self, file_path: Union[str, Path]) -> List[PRDSection]:
        """
        Parse a PRD markdown file.

        Args:
            file_path: Path to prd.md file

        Returns:
            List of PRDSection objects

        Raises:
            FileNotFoundError: If file doesn't exist
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PRD file not found: {file_path}")

        content = path.read_text(encoding="utf-8")
        return self.parse_prd_content(content)

    def parse_prd_content(self, content: str) -> List[PRDSection]:
        """
        Parse PRD content string.

        Args:
            content: PRD markdown content

        Returns:
            List of PRDSection objects
        """
        sections = []
        lines = content.splitlines()

        current_section = None
        current_content = []
        current_objectives = []

        for line in lines:
            # Check for heading
            heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)

            if heading_match:
                # Save previous section if exists
                if current_section:
                    sections.append(
                        PRDSection(
                            title=current_section["title"],
                            content="\n".join(current_content).strip(),
                            level=current_section["level"],
                            objectives=current_objectives,
                        )
                    )

                # Start new section
                level = len(heading_match.group(1))
                title = heading_match.group(2).strip()

                current_section = {"title": title, "level": level}
                current_content = []
                current_objectives = []

            elif current_section:
                # Check for objectives (list items)
                objective_match = re.match(r"^[-*]\s+(.+)$", line)
                if objective_match:
                    objective = objective_match.group(1).strip()
                    current_objectives.append(objective)

                current_content.append(line)

        # Save final section
        if current_section:
            sections.append(
                PRDSection(
                    title=current_section["title"],
                    content="\n".join(current_content).strip(),
                    level=current_section["level"],
                    objectives=current_objectives,
                )
            )

        return sections

    def extract_topics(self, sections: List[PRDSection]) -> List[str]:
        """
        Extract main topics from PRD sections.

        Args:
            sections: List of PRD sections

        Returns:
            List of topic strings
        """
        # Use top-level headings (h1, h2) as topics
        return [section.title for section in sections if section.level <= 2]


def create_curriculum_backlog_mapping(
    prd_sections: List[PRDSection],
    tasks: List[TaskmasterTask],
    keywords_to_tags: Optional[Dict[str, List[str]]] = None,
) -> Dict[str, List[str]]:
    """
    Create mapping between curriculum topics and task IDs.

    Args:
        prd_sections: Parsed PRD sections
        tasks: Parsed tasks from tasks.json
        keywords_to_tags: Optional mapping of keywords to task tags for matching

    Returns:
        Dictionary mapping topic titles to task IDs
    """
    mapping = {}

    # Extract topics from PRD (using h1 and h2 headings)
    topics = [s for s in prd_sections if s.level <= 2]

    for topic in topics:
        topic_title = topic.title
        matched_task_ids = []

        # Strategy 1: Match by keywords in topic title/objectives
        topic_keywords = set(re.findall(r"\w+", topic_title.lower()))
        for obj in topic.objectives:
            topic_keywords.update(re.findall(r"\w+", obj.lower()))

        # Match against task titles and descriptions
        for task in tasks:
            task_keywords = set(
                re.findall(r"\w+", task.title.lower())
                + re.findall(r"\w+", task.description.lower())
            )

            # Check for keyword overlap
            overlap = topic_keywords & task_keywords
            if len(overlap) >= 2:  # Require at least 2 matching keywords
                matched_task_ids.append(task.id)

        # Strategy 2: Match by explicit tags if provided
        if keywords_to_tags:
            for keyword, tag_list in keywords_to_tags.items():
                if keyword.lower() in topic_title.lower():
                    # Find tasks with matching tags
                    for task in tasks:
                        if task.tags and any(tag in task.tags for tag in tag_list):
                            if task.id not in matched_task_ids:
                                matched_task_ids.append(task.id)

        mapping[topic_title] = matched_task_ids

    return mapping
