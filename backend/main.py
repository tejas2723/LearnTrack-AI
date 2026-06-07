import os
import csv
import random
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import init_db, db, get_next_sequence_value
from backend.config import settings
from backend.models.user import User
from backend.models.quiz import Quiz, Question
from backend.models.result import ConceptMastery, StudySession, Badge, ChatHistory
from backend.models.suggestion import Suggestion
from backend.models.material import StudyMaterial
from backend.routers import auth, students, quizzes, analytics, teachers, admin, results, suggestions, questions, chatbot, materials
from backend.routers.auth import get_password_hash

# Define lifespan event for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB tables / indexes
    print("Initializing database indexes...")
    init_db()
    
    # 2. Seed database from CSV if empty
    try:
        # Check if database is empty
        student_count = db.users.count_documents({"role": "student"})
        if student_count == 0:
            print("Seeding database from CSV...")
            seed_database(db)
        else:
            print(f"Database already has {student_count} students. Skipping seed.")
    except Exception as e:
        print(f"Error during DB seeding: {e}")
        
    yield

app = FastAPI(
    title="LearnTrack AI - Academic Performance Engine",
    description="FastAPI backend for student analytics, scikit-learn grading projections, and cognitive tutoring chatbot.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads folder exists and mount static files
os.makedirs("uploads/materials", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(quizzes.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(teachers.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(results.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(materials.router, prefix="/api")

# Database Seeding Logic
def seed_database(db_conn):
    hashed_default_pwd = get_password_hash("password123")
    
    # 1. Create Teacher and Admin
    teacher_id = get_next_sequence_value("users")
    db_conn.users.insert_one({
        "_id": teacher_id,
        "email": "teacher@school.com",
        "hashed_password": hashed_default_pwd,
        "full_name": "Dr. Sarah Jenkins",
        "role": "teacher",
        "is_active": True,
        "created_at": datetime.now() - timedelta(days=30)
    })
    
    admin_id = get_next_sequence_value("users")
    db_conn.users.insert_one({
        "_id": admin_id,
        "email": "admin@school.com",
        "hashed_password": hashed_default_pwd,
        "full_name": "System Admin",
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now() - timedelta(days=30)
    })

    # 2. Create Quizzes
    quiz_specs = [
        {
            "title": "Compiler Design Quiz",
            "subject": "compiler_design",
            "questions": [
                {
                    "q": "What is the primary output of lexical analysis?",
                    "opts": ["Abstract Syntax Tree", "Parse Tree", "Token Stream", "Assembly Code"],
                    "correct": 2
                },
                {
                    "q": "Which phase of compiler construction builds the parse tree?",
                    "opts": ["Lexical Analysis", "Syntax Analysis", "Code Generation", "Optimization"],
                    "correct": 1
                },
                {
                    "q": "LL(1) parsing belongs to which category?",
                    "opts": ["Top-down parsing", "Bottom-up parsing", "Shift-reduce parsing", "Operator-precedence parsing"],
                    "correct": 0
                },
                {
                    "q": "A compiler that runs on one platform but produces code for another is called:",
                    "opts": ["Cross Compiler", "Bootstrapping compiler", "Decompiler", "JIT Compiler"],
                    "correct": 0
                },
                {
                    "q": "Which symbol table implementation is fastest for average insertion and lookup?",
                    "opts": ["Linear List", "Binary Search Tree", "Hash Table", "Self-balancing Tree"],
                    "correct": 2
                }
            ]
        },
        {
            "title": "Computer Networks Quiz",
            "subject": "computer_networks",
            "questions": [
                {
                    "q": "Which OSI layer handles routing, addressing, and path determination?",
                    "opts": ["Data Link Layer", "Network Layer", "Transport Layer", "Session Layer"],
                    "correct": 1
                },
                {
                    "q": "Which protocol is connection-oriented and guarantees delivery?",
                    "opts": ["UDP", "TCP", "IP", "ICMP"],
                    "correct": 1
                },
                {
                    "q": "What is the primary function of DNS?",
                    "opts": ["Route IP packets", "Encrypt network traffic", "Map hostnames to IP addresses", "Dynamically assign IP addresses"],
                    "correct": 2
                },
                {
                    "q": "Which layer handles node-to-node framing and error checking?",
                    "opts": ["Transport Layer", "Application Layer", "Network Layer", "Data Link Layer"],
                    "correct": 3
                },
                {
                    "q": "What is the size of an IPv6 address?",
                    "opts": ["32 bits", "64 bits", "128 bits", "256 bits"],
                    "correct": 2
                }
            ]
        },
        {
            "title": "Machine Learning Quiz",
            "subject": "machine_learning",
            "questions": [
                {
                    "q": "What is the goal of Gradient Descent in training neural networks?",
                    "opts": ["Maximize the learning rate", "Minimize the loss function", "Increase network depth", "Initialize random weights"],
                    "correct": 1
                },
                {
                    "q": "Which algorithm is commonly used for unsupervised clustering?",
                    "opts": ["Logistic Regression", "Random Forest", "K-Means", "Support Vector Machine"],
                    "correct": 2
                },
                {
                    "q": "Overfitting occurs when a model performs:",
                    "opts": ["Poorly on training, well on test data", "Well on training, poorly on test data", "Poorly on both training and test data", "Well on both training and test data"],
                    "correct": 1
                },
                {
                    "q": "Which function is commonly used as an activation function to introduce non-linearity?",
                    "opts": ["Linear", "Sigmoid / ReLU", "Standard Deviation", "Variance"],
                    "correct": 1
                },
                {
                    "q": "What is the role of the validation dataset?",
                    "opts": ["Final performance measurement", "Training model parameters", "Hyperparameter tuning and model selection", "Cleaning raw data"],
                    "correct": 2
                }
            ]
        },
        {
            "title": "Internet of Things Quiz",
            "subject": "internet_of_things",
            "questions": [
                {
                    "q": "Which protocol is a lightweight publish-subscribe protocol ideal for IoT sensors?",
                    "opts": ["HTTP", "MQTT", "FTP", "SMTP"],
                    "correct": 1
                },
                {
                    "q": "What type of hardware collects ambient temperature data in an IoT system?",
                    "opts": ["Actuator", "Gateway", "Sensor", "Microcontroller"],
                    "correct": 2
                },
                {
                    "q": "Which microcontroller is widely used in IoT because it has built-in Wi-Fi and Bluetooth?",
                    "opts": ["Arduino Uno", "ESP32", "Raspberry Pi Zero", "Intel 8051"],
                    "correct": 1
                },
                {
                    "q": "What does the 'T' in MQTT stand for?",
                    "opts": ["Transport", "Telemetry", "Transfer", "Time"],
                    "correct": 1
                },
                {
                    "q": "What is the primary purpose of an IoT gateway?",
                    "opts": ["Powering sensors directly", "Bridging device networks with the internet/cloud", "Running machine learning models locally", "Displaying dashboard UI"],
                    "correct": 1
                }
            ]
        },
        {
            "title": "Development Engineering Quiz",
            "subject": "development_engineering",
            "questions": [
                {
                    "q": "What does CI/CD stand for in modern software engineering?",
                    "opts": ["Continuous Integration / Continuous Deployment", "Code Indexing / Cloud Database", "Client Interface / Compiler Design", "Computing Infrastructure / Cloud Delivery"],
                    "correct": 0
                },
                {
                    "q": "Which phase of the SDLC follows software testing?",
                    "opts": ["Design", "Requirements Analysis", "Deployment & Maintenance", "Implementation/Coding"],
                    "correct": 2
                },
                {
                    "q": "In Git, which command creates a copy of a remote repository on your local computer?",
                    "opts": ["git push", "git pull", "git clone", "git commit"],
                    "correct": 2
                },
                {
                    "q": "What is the primary purpose of unit testing?",
                    "opts": ["Test the system performance under heavy load", "Verify that individual units of source code work correctly", "Audit database access security", "Design the user interface layout"],
                    "correct": 1
                },
                {
                    "q": "What methodology emphasizes iterative development, collaboration, and customer feedback?",
                    "opts": ["Waterfall", "Agile", "V-Model", "Spiral"],
                    "correct": 1
                }
            ]
        }
    ]

    for spec in quiz_specs:
        quiz_id = get_next_sequence_value("quizzes")
        db_conn.quizzes.insert_one({
            "_id": quiz_id,
            "title": spec["title"],
            "subject": spec["subject"],
            "is_active": True
        })
        
        for idx, q in enumerate(spec["questions"]):
            correct_char = ["a", "b", "c", "d"][q["correct"]]
            diff = ["easy", "medium", "medium", "hard", "hard"][idx % 5]
            marks_val = [1, 2, 2, 5, 5][idx % 5]
            expl = f"The correct answer is '{q['opts'][q['correct']]}'. This concept is a core part of the {spec['title']} syllabus."
            topic_val = ["Basics", "Fundamentals", "Intermediate", "Advanced", "Applications"][idx % 5]
            
            question_id = get_next_sequence_value("questions")
            db_conn.questions.insert_one({
                "_id": question_id,
                "quiz_id": quiz_id,
                "question_text": q["q"],
                "option_a": q["opts"][0],
                "option_b": q["opts"][1],
                "option_c": q["opts"][2],
                "option_d": q["opts"][3],
                "correct_option": correct_char,
                "explanation": expl,
                "difficulty": diff,
                "topic": topic_val,
                "subject": spec["subject"],
                "marks": marks_val,
                "time_limit_seconds": 60
            })

    # 3. Read CSV and seed students
    if not os.path.exists(settings.CSV_SEED_PATH):
        print(f"WARNING: CSV seed file not found at {settings.CSV_SEED_PATH}. Skipping student seeding.")
        return

    with open(settings.CSV_SEED_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("student_full_name")
            prn = row.get("prn_no")
            email = row.get("email_id")
            class_name = row.get("class_name")
            
            if not name or not prn or not email:
                continue
                
            email_clean = email.strip()
            prn_clean = prn.strip()
            if not email_clean or not prn_clean:
                continue
                
            # Check if user already exists
            existing_user = db_conn.users.find_one({
                "$or": [
                    {"email": email_clean},
                    {"prn_no": prn_clean}
                ]
            })
            if existing_user:
                continue
                
            # Random predicted score (65 to 90) and risk
            predicted = random.randint(65, 90)
            risk = "Low"
            if predicted < 75:
                risk = "Medium"
                
            styles = ["Visual learning", "Practice-based learning", "Reading-based learning"]
            pref_style = random.choice(styles)
            
            # Random registration date in the last 30 days
            created_at_days_ago = random.randint(0, 30)
            created_date = datetime.now() - timedelta(days=created_at_days_ago)

            student_id = get_next_sequence_value("users")
            db_conn.users.insert_one({
                "_id": student_id,
                "email": email_clean,
                "hashed_password": hashed_default_pwd,
                "full_name": name.strip(),
                "role": "student",
                "prn_no": prn_clean,
                "class_name": class_name.strip(),
                "predicted_score": predicted,
                "risk_level": risk,
                "preferred_style": pref_style,
                "is_active": True,
                "created_at": created_date
            })
            
            # Create Study Sessions for the past 5 days
            now = datetime.now()
            for i in range(5, 0, -1):
                date = now - timedelta(days=i)
                hour = random.choice([9, 10, 19, 20])
                date = date.replace(hour=hour, minute=random.randint(0, 59))
                
                session_id = get_next_sequence_value("study_sessions")
                db_conn.study_sessions.insert_one({
                    "_id": session_id,
                    "student_id": student_id,
                    "timestamp": date,
                    "duration_minutes": random.randint(45, 120),
                    "focus_score": random.randint(60, 95),
                    "idle_minutes": random.randint(2, 15),
                    "questions_attempted": random.randint(5, 15)
                })
                
            # Create default Badge
            badge_id = get_next_sequence_value("badges")
            db_conn.badges.insert_one({
                "_id": badge_id,
                "student_id": student_id,
                "badge_id": "beginner_learner",
                "name": "Beginner Learner",
                "description": "Successfully onboarded onto LearnTrack AI",
                "unlocked_at": datetime.now()
            })
            
            # Create default Concept Mastery Map entries
            math_topics = [
                ("Mathematics", "Algebra", True),
                ("Mathematics", "Calculus", True),
                ("Mathematics", "Probability", False),
                ("Mathematics", "Conditional Probability", False),
                ("Mathematics", "Bayes Theorem", False)
            ]
            cs_topics = [
                ("Computer Science", "Data Link Layer", True),
                ("Computer Science", "Routing Algorithms", False),
                ("Computer Science", "Neural Networks", False),
                ("Computer Science", "Lexical Analysis", True),
                ("Computer Science", "Parsing Trees", False)
            ]
            
            for cat, topic, mastered in (math_topics + cs_topics):
                cm_id = get_next_sequence_value("concept_mastery")
                db_conn.concept_mastery.insert_one({
                    "_id": cm_id,
                    "student_id": student_id,
                    "category": cat,
                    "topic": topic,
                    "is_mastered": mastered
                })
            
    print("Database seeding completed.")

@app.get("/")
def read_root():
    return {"message": "LearnTrack AI Performance Engine Backend Active", "docs_url": "/docs"}
