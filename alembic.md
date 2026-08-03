# Alembic in Python: A Complete Guide

## What is Alembic?

**Alembic** is the official database migration tool for **SQLAlchemy**, the most popular ORM (Object-Relational Mapper) in Python. It allows you to manage and version-control your database schema changes over time — essentially **Git for your database structure**.

> **Analogy:** If SQLAlchemy is how you *talk* to your database, Alembic is how you *evolve* it safely.

---

## Why Do You Need Alembic?

| Problem | Alembic Solution |
|---|---|
| You add a new column to a model | Generates a migration script to apply it |
| You need to roll back a bad change | `alembic downgrade` reverts it |
| Team members need the same schema | Version-controlled migration files ensure consistency |
| Production database needs updates | Automated, repeatable, safe deployments |
| You forget what changed when | Every migration has a unique ID and timestamp |

---

## Core Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SQLAlchemy     │────▶│  Alembic        │────▶│  Database       │
│  Models (.py)   │     │  Migrations/    │     │  (PostgreSQL,   │
│                 │     │  Revision Files │     │  MySQL, SQLite) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │  alembic.ini    │  ← Config file
         │              │  env.py         │  ← Runtime environment
         │              │  script.py.mako │  ← Migration template
         │              └─────────────────┘
         │
    [autogenerate] ──▶ Detects model changes and creates migration scripts
```

---

## Key Components

### 1. **`alembic.ini`** — Configuration File
The entry point. Tells Alembic where your database is, where migrations live, etc.

```ini
[alembic]
script_location = alembic          # Folder containing migrations
sqlalchemy.url = postgresql://user:pass@localhost/dbname

[loggers]
# Logging configuration...
```

### 2. **`env.py`** — Runtime Environment
The Python script Alembic runs to set up the migration context. This is where you:
- Import your SQLAlchemy `Base` / `metadata`
- Configure the database connection dynamically
- Set up target metadata for autogenerate

```python
# env.py (simplified)
from myapp.models import Base  # Your SQLAlchemy models
target_metadata = Base.metadata  # Enables autogenerate
```

### 3. **`versions/`** — Migration Scripts
Each schema change is a Python file in this folder with:
- A unique revision ID (hash)
- `upgrade()` function — applies the change
- `downgrade()` function — reverts the change

```python
# versions/2024_01_15_a1b2c3d4_add_user_table.py
"""Add user table"""

revision = 'a1b2c3d4e5f6'
down_revision = 'previous_revision_id'  # Linked list structure
branch_labels = None

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(120), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('users')
```

> **Important:** Migrations form a **linked list** via `down_revision`. Alembic knows the exact order to apply them.

---

## The Migration Workflow

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ 1. Modify   │───▶│ 2. Generate      │───▶│ 3. Review &     │
│    Models   │    │    Migration     │    │    Edit Script  │
│    (.py)    │    │    (autogenerate)│    │                 │
└─────────────┘    └──────────────────┘    └─────────────────┘
                                                    │
┌─────────────┐    ┌──────────────────┐            │
│ 6. Commit   │◀───│ 5. Apply to      │◀───────────┘
│    to Git   │    │    Database      │
│    (versions/│    │    (upgrade)     │
│    folder)  │    └──────────────────┘
└─────────────┘
```

### Step-by-Step Commands

| Step | Command | Purpose |
|---|---|---|
| Initialize | `alembic init alembic` | Creates the migration environment |
| Create migration | `alembic revision --autogenerate -m "Add users table"` | Detects model changes and creates a script |
| Review | Open `versions/xxx_.py` | Verify the generated SQL operations |
| Apply | `alembic upgrade head` | Runs all pending migrations |
| Rollback one | `alembic downgrade -1` | Reverts the last migration |
| Rollback to zero | `alembic downgrade base` | Reverts everything |
| Check status | `alembic current` / `alembic history` | See where you are |

---

## Autogenerate: How It Works

```python
# Your model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    # You ADD this new line:
    age = Column(Integer, nullable=True)
```

When you run:
```bash
alembic revision --autogenerate -m "Add age column"
```

Alembic compares:
- **`Base.metadata`** (your Python models) 
- **Actual database schema** (via `sqlalchemy.url`)

And generates:
```python
def upgrade():
    op.add_column('users', sa.Column('age', sa.Integer(), nullable=True))

def downgrade():
    op.drop_column('users', 'age')
```

> ⚠️ **Autogenerate is not perfect.** It handles tables, columns, indexes, and constraints well, but cannot detect:
> - Column renames (it sees drop + add)
> - Data migrations (e.g., splitting a column)
> - Some advanced constraint changes
>
> Always review generated scripts!

---

## Where Alembic Fits in Web Development

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION STACK                    │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer:  React / Next.js / HTML Templates        │
├─────────────────────────────────────────────────────────────┤
│  API Layer:           FastAPI / Flask / Django REST           │
├─────────────────────────────────────────────────────────────┤
│  Business Logic:      Python Services / Use Cases             │
├─────────────────────────────────────────────────────────────┤
│  ORM Layer:           SQLAlchemy Models ◄── YOU DEFINE SCHEMA│
├─────────────────────────────────────────────────────────────┤
│  Migration Layer:     ALEMBIC ◄── EVOLVES SCHEMA SAFELY     │
├─────────────────────────────────────────────────────────────┤
│  Database:            PostgreSQL / MySQL / SQLite / Oracle    │
└─────────────────────────────────────────────────────────────┘
```

**Alembic sits between your SQLAlchemy models and your actual database.** It bridges the gap between "code changes" and "database reality."

---

## Best Practices

| Practice | Why |
|---|---|
| **Always review autogenerated scripts** | Prevents accidental data loss |
| **Never edit a migration after it's been applied to production** | Create a new migration instead |
| **Test upgrades AND downgrades** | Ensures you can roll back if needed |
| **Commit `versions/` to Git** | Migrations are code — version them |
| **Use `server_default` for new non-nullable columns** | Avoids errors on existing data |
| **Name migrations descriptively** | `add_user_profile_table` > `migration_3` |
| **Run migrations in CI/CD** | Automate production schema updates |

---

## Quick Reference: Common Operations

```python
# Create table
op.create_table('products', ...)

# Add column
op.add_column('users', sa.Column('phone', sa.String(20)))

# Alter column
op.alter_column('users', 'email', type_=sa.String(255))

# Create index
op.create_index('ix_users_email', 'users', ['email'])

# Execute raw SQL
op.execute("UPDATE users SET status = 'active' WHERE ...")

# Batch alter (SQLite support)
with op.batch_alter_table('users') as batch_op:
    batch_op.add_column(sa.Column('bio', sa.Text()))
```

---

## Summary

| Question | Answer |
|---|---|
| **Is Alembic a server?** | No. It's a CLI tool and Python library. |
| **Is it part of SQLAlchemy?** | It's the official companion tool, maintained by the same team. |
| **Do I need it for every project?** | If you use SQLAlchemy and your schema changes over time — **yes.** |
| **Can I use it without autogenerate?** | Yes. You can write migrations manually for full control. |

Alembic transforms database schema changes from risky, manual operations into **versioned, testable, repeatable code** — an essential practice for any serious Python backend project.