import random
from datetime import datetime, timedelta
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.api.auth import get_password_hash
from app.models.user import User
from app.models.content import Content
from app.models.interaction import Interaction


SAMPLE_USERS = [
    {
        "email": "admin@example.com",
        "password": "admin123",
        "full_name": "Admin User",
        "skill_level": "advanced",
        "preferred_topics": ["python", "machine-learning", "data-science"],
        "learning_goals": ["Build production ML pipelines", "Master system architecture"],
        "is_admin": True,
    },
    {
        "email": "student@example.com",
        "password": "student123",
        "full_name": "Alice Johnson",
        "skill_level": "beginner",
        "preferred_topics": ["python", "web-development"],
        "learning_goals": ["Learn web development basics", "Understand Python syntax"],
        "is_admin": False,
    },
    {
        "email": "bob@example.com",
        "password": "bob12345",
        "full_name": "Bob Smith",
        "skill_level": "intermediate",
        "preferred_topics": ["javascript", "web-development"],
        "learning_goals": ["Master React", "Build full-stack applications"],
        "is_admin": False,
    },
    {
        "email": "carol@example.com",
        "password": "carol123",
        "full_name": "Carol Williams",
        "skill_level": "advanced",
        "preferred_topics": ["data-science", "machine-learning"],
        "learning_goals": ["Deep learning research", "Optimize recommendation engines"],
        "is_admin": False,
    },
    {
        "email": "dave@example.com",
        "password": "dave1234",
        "full_name": "Dave Brown",
        "skill_level": "beginner",
        "preferred_topics": ["python", "javascript"],
        "learning_goals": ["Career switch to tech", "Learn to code"],
        "is_admin": False,
    },
]


SAMPLE_CONTENT = [
    # Python - Beginner
    {
        "title": "Python Fundamentals: Variables and Data Types",
        "description": "Learn the building blocks of Python programming including variables, strings, numbers, and basic operations. Perfect for absolute beginners.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["python"],
        "skills_taught": ["variables", "data-types", "syntax"],
        "learning_objectives": ["Understand Python variables", "Manipulate basic data types"],
        "prerequisites": [],
        "duration_minutes": 45,
        "author": "Dr. Sarah Chen"
    },
    {
        "title": "Python Control Flow: If Statements and Loops",
        "description": "Master conditional logic and iteration in Python with practical examples and exercises.",
        "content_type": "article",
        "difficulty": "beginner",
        "topics": ["python"],
        "skills_taught": ["control-flow", "loops", "conditionals"],
        "learning_objectives": ["Write if-else logic", "Implement for and while loops"],
        "prerequisites": [1], # Depends on Fundamentals
        "duration_minutes": 30,
        "author": "Dr. Sarah Chen"
    },
    {
        "title": "Python Functions and Modules",
        "description": "Understand how to write reusable code with functions, parameters, return values, and module imports.",
        "content_type": "exercise",
        "difficulty": "beginner",
        "topics": ["python"],
        "skills_taught": ["functions", "modules", "code-organization"],
        "learning_objectives": ["Create reusable functions", "Import external modules"],
        "prerequisites": [2], # Depends on Control Flow
        "duration_minutes": 60,
        "author": "Prof. James Miller"
    },
    
    # Python - Intermediate
    {
        "title": "Object-Oriented Python: Classes and Inheritance",
        "description": "Deep dive into OOP concepts in Python including classes, inheritance, polymorphism, and encapsulation.",
        "content_type": "video",
        "difficulty": "intermediate",
        "topics": ["python"],
        "skills_taught": ["oop", "classes", "inheritance"],
        "learning_objectives": ["Define Python classes", "Implement class inheritance"],
        "prerequisites": [3],
        "duration_minutes": 75,
        "author": "Prof. James Miller"
    },
    
    # JavaScript
    {
        "title": "JavaScript Essentials: Your First Script",
        "description": "Get started with JavaScript by understanding variables, operators, and how to manipulate web pages.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["javascript", "web-development"],
        "skills_taught": ["javascript-basics", "dom-manipulation"],
        "learning_objectives": ["Run JS in browser", "Select DOM elements"],
        "prerequisites": [],
        "duration_minutes": 50,
        "author": "Mark Thompson"
    },
    {
        "title": "React Fundamentals: Components and State",
        "description": "Build dynamic user interfaces with React. Learn about components, props, state, and the virtual DOM.",
        "content_type": "project",
        "difficulty": "intermediate",
        "topics": ["javascript", "web-development"],
        "skills_taught": ["react", "components", "state-management"],
        "learning_objectives": ["Build React components", "Manage component state"],
        "prerequisites": [5],
        "duration_minutes": 120,
        "author": "Emily Zhang"
    },

    # ML & Data Science
    {
        "title": "Introduction to Data Analysis with Pandas",
        "description": "Learn how to load, clean, and analyze datasets using the Python Pandas library.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["data-science", "python"],
        "skills_taught": ["pandas", "data-analysis", "dataframes"],
        "learning_objectives": ["Clean data with Pandas", "Perform basic aggregations"],
        "prerequisites": [1],
        "duration_minutes": 55,
        "author": "Dr. Maria Rodriguez"
    },
    {
        "title": "Machine Learning 101: What Is ML?",
        "description": "A gentle introduction to machine learning concepts, types of learning, and real-world applications.",
        "content_type": "article",
        "difficulty": "beginner",
        "topics": ["machine-learning"],
        "skills_taught": ["ml-concepts", "supervised-learning", "unsupervised-learning"],
        "learning_objectives": ["Distinguish ML types", "Identify ML use cases"],
        "prerequisites": [],
        "duration_minutes": 25,
        "author": "Prof. Andrew Ng Jr."
    },
    {
        "title": "Advanced Recommendation Engines",
        "description": "Master hybrid deep learning architectures for personalized recommendations.",
        "content_type": "project",
        "difficulty": "advanced",
        "topics": ["machine-learning", "python"],
        "skills_taught": ["hdlrs", "deep-learning", "ensemble-methods"],
        "learning_objectives": ["Implement DeepFM", "Build ensemble fusion layers"],
        "prerequisites": [8, 4],
        "duration_minutes": 180,
        "author": "Prof. Andrew Ng Jr."
    },

    # Java
    {
        "title": "Java Fundamentals: Getting Started",
        "description": "Learn Java basics including variables, data types, control flow, and object-oriented programming concepts.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["java"],
        "skills_taught": ["java-basics", "oop", "syntax"],
        "learning_objectives": ["Write basic Java programs", "Understand OOP fundamentals"],
        "prerequisites": [],
        "duration_minutes": 60,
        "author": "Dr. Sarah Chen"
    },
    {
        "title": "Java Collections Framework",
        "description": "Master Lists, Sets, Maps, and Queues in Java for efficient data management.",
        "content_type": "article",
        "difficulty": "intermediate",
        "topics": ["java"],
        "skills_taught": ["collections", "generics", "data-structures"],
        "learning_objectives": ["Use ArrayList and HashMap", "Implement custom comparators"],
        "prerequisites": [10],
        "duration_minutes": 45,
        "author": "Prof. James Miller"
    },
    {
        "title": "Spring Boot REST API Development",
        "description": "Build production-ready REST APIs with Spring Boot, including authentication and database integration.",
        "content_type": "project",
        "difficulty": "advanced",
        "topics": ["java"],
        "skills_taught": ["spring-boot", "rest-api", "jpa"],
        "learning_objectives": ["Create REST endpoints", "Implement Spring Security"],
        "prerequisites": [11],
        "duration_minutes": 150,
        "author": "Emily Zhang"
    },

    # C++
    {
        "title": "C++ Basics: Syntax and Pointers",
        "description": "Get started with C++ programming — variables, pointers, references, and memory management basics.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["cpp"],
        "skills_taught": ["cpp-syntax", "pointers", "memory"],
        "learning_objectives": ["Declare and use pointers", "Understand stack vs heap"],
        "prerequisites": [],
        "duration_minutes": 55,
        "author": "Mark Thompson"
    },
    {
        "title": "C++ Object-Oriented Programming",
        "description": "Deep dive into classes, inheritance, polymorphism, and operator overloading in C++.",
        "content_type": "exercise",
        "difficulty": "intermediate",
        "topics": ["cpp"],
        "skills_taught": ["oop", "inheritance", "polymorphism"],
        "learning_objectives": ["Implement class hierarchies", "Use virtual functions"],
        "prerequisites": [13],
        "duration_minutes": 70,
        "author": "Prof. James Miller"
    },

    # Go
    {
        "title": "Go Programming: From Zero to Hero",
        "description": "Learn Go from scratch — syntax, goroutines, channels, and building concurrent applications.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["go"],
        "skills_taught": ["go-basics", "goroutines", "channels"],
        "learning_objectives": ["Write Go programs", "Implement concurrency patterns"],
        "prerequisites": [],
        "duration_minutes": 65,
        "author": "Dr. Maria Rodriguez"
    },
    {
        "title": "Building Web Services with Go",
        "description": "Create high-performance REST APIs and microservices using Go's standard library and popular frameworks.",
        "content_type": "project",
        "difficulty": "intermediate",
        "topics": ["go"],
        "skills_taught": ["web-services", "http", "json"],
        "learning_objectives": ["Build HTTP servers", "Handle JSON request/response"],
        "prerequisites": [15],
        "duration_minutes": 90,
        "author": "Mark Thompson"
    },

    # Rust
    {
        "title": "Rust Essentials: Ownership and Borrowing",
        "description": "Understand Rust's unique ownership system, borrowing rules, and lifetimes for memory-safe programming.",
        "content_type": "video",
        "difficulty": "intermediate",
        "topics": ["rust"],
        "skills_taught": ["ownership", "borrowing", "lifetimes"],
        "learning_objectives": ["Manage ownership transfers", "Apply borrowing rules"],
        "prerequisites": [],
        "duration_minutes": 80,
        "author": "Prof. Andrew Ng Jr."
    },
    {
        "title": "Systems Programming with Rust",
        "description": "Build performant systems software with Rust — CLI tools, file I/O, and error handling patterns.",
        "content_type": "project",
        "difficulty": "advanced",
        "topics": ["rust"],
        "skills_taught": ["systems-programming", "error-handling", "cli"],
        "learning_objectives": ["Build CLI applications", "Implement robust error handling"],
        "prerequisites": [17],
        "duration_minutes": 120,
        "author": "Emily Zhang"
    },

    # TypeScript
    {
        "title": "TypeScript Fundamentals",
        "description": "Add static typing to your JavaScript projects with TypeScript — types, interfaces, and generics.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["typescript", "javascript"],
        "skills_taught": ["type-annotations", "interfaces", "generics"],
        "learning_objectives": ["Define types and interfaces", "Use generics effectively"],
        "prerequisites": [5],
        "duration_minutes": 50,
        "author": "Emily Zhang"
    },
    {
        "title": "Full-Stack TypeScript with React",
        "description": "Build type-safe full-stack applications using TypeScript with React frontend and Node.js backend.",
        "content_type": "project",
        "difficulty": "intermediate",
        "topics": ["typescript", "web-development"],
        "skills_taught": ["react-ts", "node-ts", "full-stack"],
        "learning_objectives": ["Build React apps with TypeScript", "Create typed APIs"],
        "prerequisites": [19],
        "duration_minutes": 140,
        "author": "Mark Thompson"
    },

    # SQL
    {
        "title": "SQL Fundamentals: Querying Databases",
        "description": "Learn to write SQL queries — SELECT, WHERE, JOIN, GROUP BY, and subqueries for data retrieval.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["sql", "data-science"],
        "skills_taught": ["sql-queries", "joins", "aggregations"],
        "learning_objectives": ["Write complex SQL queries", "Perform data aggregations"],
        "prerequisites": [],
        "duration_minutes": 40,
        "author": "Dr. Maria Rodriguez"
    },
    {
        "title": "Database Design and Optimization",
        "description": "Learn normalization, indexing strategies, and query optimization for production databases.",
        "content_type": "article",
        "difficulty": "advanced",
        "topics": ["sql"],
        "skills_taught": ["normalization", "indexing", "optimization"],
        "learning_objectives": ["Design normalized schemas", "Optimize slow queries"],
        "prerequisites": [21],
        "duration_minutes": 60,
        "author": "Prof. James Miller"
    },

    # Kotlin
    {
        "title": "Kotlin for Android Development",
        "description": "Get started with Kotlin — modern syntax, null safety, coroutines, and building Android apps.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["kotlin"],
        "skills_taught": ["kotlin-basics", "null-safety", "coroutines"],
        "learning_objectives": ["Write Kotlin programs", "Understand null safety"],
        "prerequisites": [],
        "duration_minutes": 55,
        "author": "Dr. Sarah Chen"
    },

    # Swift
    {
        "title": "Swift and SwiftUI Basics",
        "description": "Learn Swift programming and build iOS interfaces with SwiftUI — optionals, closures, and declarative UI.",
        "content_type": "video",
        "difficulty": "beginner",
        "topics": ["swift"],
        "skills_taught": ["swift-basics", "swiftui", "optionals"],
        "learning_objectives": ["Build SwiftUI views", "Handle optionals safely"],
        "prerequisites": [],
        "duration_minutes": 50,
        "author": "Emily Zhang"
    },
]


def _generate_interactions(
    user_ids: List[int], content_ids: List[int], count: int = 100
) -> List[dict]:
    """Generate random but realistic interactions."""
    interaction_types = ["view", "click", "complete", "bookmark", "rate"]
    interactions = []
    seen = set()

    for _ in range(count * 3):  # Generate extra to account for deduplication
        if len(interactions) >= count:
            break

        user_id = random.choice(user_ids)
        content_id = random.choice(content_ids)
        itype = random.choice(interaction_types)

        key = (user_id, content_id, itype)
        if key in seen:
            continue
        seen.add(key)

        interaction = {
            "user_id": user_id,
            "content_id": content_id,
            "interaction_type": itype,
            "rating": round(random.uniform(2.0, 5.0), 1) if itype == "rate" else None,
            "time_spent_seconds": random.randint(30, 3600) if itype in ("view", "complete") else None,
            "completed": itype == "complete",
        }
        interactions.append(interaction)

    return interactions[:count]


async def seed_database(db: AsyncSession) -> None:
    """Populate the database with sample data if the users table is empty."""
    result = await db.execute(select(func.count(User.id)))
    user_count = result.scalar()
    if user_count > 0:
        logger.info("Database already seeded, skipping")
        return

    logger.info("Seeding database with sample data for HDLRS...")

    # Create users
    users = []
    for user_data in SAMPLE_USERS:
        user = User(
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            full_name=user_data["full_name"],
            skill_level=user_data["skill_level"],
            preferred_topics=user_data["preferred_topics"],
            learning_goals=user_data["learning_goals"],
            is_admin=user_data["is_admin"],
            is_verified=True,
        )
        db.add(user)
        users.append(user)
    await db.flush()

    user_ids = [u.id for u in users]
    logger.info(f"Created {len(users)} users")

    # Create content
    content_items = []
    # Note: IDs are assigned sequentially starting from 1 in a fresh DB
    for content_data in SAMPLE_CONTENT:
        content = Content(**content_data)
        db.add(content)
        content_items.append(content)
    await db.flush()

    content_ids = [c.id for c in content_items]
    logger.info(f"Created {len(content_items)} content items with ontology links")

    # Create interactions
    random.seed(42)  # Reproducible seed data
    interaction_data = _generate_interactions(user_ids, content_ids, count=150)
    for idata in interaction_data:
        interaction = Interaction(**idata)
        db.add(interaction)
    await db.flush()
    logger.info(f"Created {len(interaction_data)} interactions")

    await db.commit()
    logger.info("Database seeding for HDLRS completed successfully")
