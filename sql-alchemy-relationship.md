# SQLAlchemy Relationships — Complete Guide

## 1. The Foundation: Primary Keys and Foreign Keys

**Primary key (PK)** uniquely identifies each row in a table. **Foreign key (FK)** is a column that references another table's PK — it's the raw SQL mechanism that links tables.

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship, Session

class Base(DeclarativeBase):
    pass

class Parent(Base):
    __tablename__ = "parent"

    id = Column(Integer, primary_key=True)          # PRIMARY KEY
    name = Column(String(50))

class Child(Base):
    __tablename__ = "child"

    id = Column(Integer, primary_key=True)          # PRIMARY KEY
    name = Column(String(50))
    parent_id = Column(Integer, ForeignKey("parent.id"))  # FOREIGN KEY
```

Key points:

- `ForeignKey("parent.id")` uses **table_name.column_name** (not class name).
- A FK by default allows `NULL` — pass `nullable=False` if the child *must* have a parent.
- `ForeignKey` alone only creates the SQL-level constraint. The **Python-level** link is `relationship()` — you usually want both.

## 2. relationship(): The ORM Layer

`ForeignKey` gives you `child.parent_id` (an integer). `relationship()` gives you `child.parent` (the actual object):

```python
class Parent(Base):
    __tablename__ = "parent"
    id = Column(Integer, primary_key=True)
    name = Column(String(50))

    children = relationship("Child", back_populates="parent")

class Child(Base):
    __tablename__ = "child"
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    parent_id = Column(Integer, ForeignKey("parent.id"))

    parent = relationship("Parent", back_populates="children")
```

- `Parent.children` → a **list** (one-to-many side).
- `Child.parent` → a **single object** (many-to-one side).
- `back_populates` explicitly names the attribute on the other side. Both directions stay synchronized automatically: setting `child.parent = p` also appends the child to `p.children`.

**`back_populates` vs `backref`:** `backref="children"` creates the reverse attribute automatically from one side only — shorter, but `back_populates` is explicit and preferred in modern code.

## 3. One-to-Many (the most common)

Shown above. Usage:

```python
with Session(engine) as session:
    p = Parent(name="Mom")
    p.children = [Child(name="c1"), Child(name="c2")]
    session.add(p)            # children are saved too (cascade "save-update")
    session.commit()
```

## 4. One-to-One

Same as one-to-many, but add `uselist=False` on the side that should return a single object:

```python
class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True)
    profile = relationship("Profile", back_populates="user", uselist=False)

class Profile(Base):
    __tablename__ = "profile"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), unique=True)  # UNIQUE enforces 1:1 at DB level
    bio = Column(String(200))
    user = relationship("User", back_populates="profile")
```

`unique=True` on the FK is what truly enforces one-to-one in the database.

## 5. Many-to-Many

Requires a **join (association) table** with two FKs:

```python
student_course = Table(
    "student_course", Base.metadata,
    Column("student_id", ForeignKey("student.id"), primary_key=True),
    Column("course_id", ForeignKey("course.id"), primary_key=True),
)

class Student(Base):
    __tablename__ = "student"
    id = Column(Integer, primary_key=True)
    courses = relationship("Course", secondary=student_course, back_populates="students")

class Course(Base):
    __tablename__ = "course"
    id = Column(Integer, primary_key=True)
    students = relationship("Student", secondary=student_course, back_populates="courses")
```

Both FK columns form a **composite primary key** — this prevents duplicate pairings.

If you need **extra columns on the link** (e.g., enrollment date, grade), use an *association object* instead — a full model for the join table with two `relationship`s pointing at it.

## 6. Cascade Delete — Two Different Layers

This is where people get confused. There are **two independent cascade mechanisms**:

### A. ORM cascade — `cascade=` on `relationship()`

Operates in Python when you call `session.delete(parent)`:

```python
children = relationship("Child", back_populates="parent",
                        cascade="all, delete-orphan")
```

Available options:

| Option | Effect |
|---|---|
| `save-update` | Child added to session when parent is (default) |
| `merge` | Child follows `session.merge()` (default) |
| `expunge` | Child removed from session with parent (default) |
| `delete` | Children deleted when parent is deleted |
| `delete-orphan` | Child deleted if **removed from the collection** too, e.g. `parent.children.remove(c)` |
| `all` | Shorthand for all of the above |

- `cascade="all, delete-orphan"` is the standard setting for one-to-many "parent owns children" designs.
- **Never** use `delete` / `delete-orphan` on a many-to-many or many-to-one relationship — deleting one student would delete shared courses.

### B. Database cascade — `ondelete=` on `ForeignKey()`

Emitted as SQL (`ON DELETE CASCADE`), executed **by the database engine**:

```python
parent_id = Column(Integer, ForeignKey("parent.id", ondelete="CASCADE"))
```

Options: `CASCADE` (delete children), `SET NULL` (null the FK), `SET DEFAULT`, `RESTRICT` (forbid deleting a parent that has children), `NO ACTION` (default — error at commit time).

**The catch:** by default SQLAlchemy ORM *ignores* `ON DELETE CASCADE` when you `session.delete()` a loaded parent — it loads the children and deletes them row-by-row itself. To let the DB do it, add:

```python
children = relationship("Child", back_populates="parent",
                        passive_deletes=True)
```

`passive_deletes=True` means "the DB handles it, don't load children just to delete them." Note that `session.query(Parent).delete()` (bulk delete) bypasses ORM cascades entirely — it only works with `ondelete` at DB level.

### Which to use?

- **ORM cascade** — you get events, orphan logic, works on any backend.
- **DB `ON DELETE CASCADE` + `passive_deletes`** — faster, works for bulk deletes and for deletes done outside your app. Production systems often use both together.

## 7. Putting It All Together

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship, Session

class Base(DeclarativeBase):
    pass

class Author(Base):
    __tablename__ = "author"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)

    # One-to-many: deleting an author deletes their books (ORM),
    # and removing a book from the list deletes it (orphan).
    books = relationship("Book", back_populates="author",
                         cascade="all, delete-orphan",
                         passive_deletes=True)

class Book(Base):
    __tablename__ = "book"
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)

    # DB-level cascade as backstop for bulk/RAW SQL deletes
    author_id = Column(Integer, ForeignKey("author.id", ondelete="CASCADE"),
                       nullable=False)

    author = relationship("Author", back_populates="books")

engine = create_engine("sqlite:///demo.db", echo=True)
Base.metadata.create_all(engine)

with Session(engine) as session:
    a = Author(name="Ursula Le Guin",
               books=[Book(title="A Wizard of Earthsea"),
                      Book(title="The Left Hand of Darkness")])
    session.add(a)
    session.commit()

    # Delete parent -> children deleted too
    session.delete(a)
    session.commit()
```

## 8. Quick Reference / Common Pitfalls

| Concept | Where it lives | What it does |
|---|---|---|
| `primary_key=True` | Column | Uniquely identifies the row |
| `ForeignKey("t.col")` | Column | SQL-level link + referential integrity |
| `relationship()` | Class | Python-level object navigation |
| `back_populates` | relationship | Bidirectional sync |
| `uselist=False` | relationship | One-to-one |
| `secondary=` | relationship | Many-to-many via join table |
| `cascade="all, delete-orphan"` | relationship | ORM-level delete propagation |
| `ondelete="CASCADE"` | ForeignKey | DB-level delete propagation |
| `passive_deletes=True` | relationship | Trust DB cascade, skip loading children |

Pitfalls to avoid:

1. FK without `relationship()` → you only have raw IDs, no object access.
2. `delete-orphan` on many-to-many → shared rows get deleted unexpectedly.
3. Relying on `ondelete="CASCADE"` alone → silently ignored by ORM `session.delete()` unless `passive_deletes=True`.
4. Bulk deletes (`query.delete()`) → skip ORM cascades completely; only DB-level `ondelete` applies.
5. Forgetting `nullable=False` on a required FK → orphans with `NULL` parents.

Want me to go deeper on any part — e.g., association objects with extra columns, self-referential relationships (trees/hierarchies), or lazy vs eager loading strategies (`selectinload`, `joinedload`)?
