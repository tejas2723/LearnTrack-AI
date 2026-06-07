from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.schemas.user import UserCreate, UserLogin, UserResponse, Token
from backend.config import settings

# Setup Router
router = APIRouter(prefix="/auth", tags=["auth"])

# Cryptography config using bcrypt directly
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# Dependency to get current user from HTTP-only cookie
async def get_current_user(request: Request, db = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    
    # Check authorization header fallback (in case frontend uses header)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user_dict = db.users.find_one({"email": email})
    if user_dict is None:
        raise credentials_exception
    return User(**user_dict)

# Role dependencies
async def require_role(required_roles: list[str], current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource"
        )
    return current_user

async def require_student(current_user: User = Depends(get_current_user)) -> User:
    return await require_role(["student"], current_user)

async def require_teacher(current_user: User = Depends(get_current_user)) -> User:
    return await require_role(["teacher"], current_user)

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    return await require_role(["admin"], current_user)

# Endpoints
@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, response: Response, db = Depends(get_db)):
    # Check if user already exists
    existing_user = db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    if user_in.prn_no:
        existing_prn = db.users.find_one({"prn_no": user_in.prn_no})
        if existing_prn:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PRN already registered"
            )

    # Hash password
    hashed_pwd = get_password_hash(user_in.password)
    
    # Generate ID
    user_id = get_next_sequence_value("users")
    
    # Create user document
    user_doc = {
        "_id": user_id,
        "email": user_in.email,
        "hashed_password": hashed_pwd,
        "full_name": user_in.full_name,
        "role": user_in.role,
        "prn_no": user_in.prn_no,
        "class_name": user_in.class_name,
        "department": user_in.department,
        "year_semester": user_in.year_semester,
        "roll_number": user_in.roll_number,
        "previous_cgpa": user_in.previous_cgpa,
        "attendance_percentage": user_in.attendance_percentage,
        "skills": user_in.skills,
        "learning_interests": user_in.learning_interests,
        "predicted_score": 70,
        "risk_level": "Low",
        "preferred_style": "Practice-based learning",
        "is_active": True,
        "created_at": datetime.now()
    }
    
    db.users.insert_one(user_doc)
    db_user = User(**user_doc)
    
    # Generate token with user_id and role
    token = create_access_token(data={"sub": db_user.email, "role": db_user.role, "user_id": db_user.id})
    
    # Set cookie (secure + samesite=none required for cross-domain)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=True
    )
    
    return db_user

@router.post("/login")
def login(user_in: UserLogin, response: Response, db = Depends(get_db)):
    user_dict = db.users.find_one({"email": user_in.email})
    if not user_dict or not verify_password(user_in.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    user = User(**user_dict)
    
    # Generate token with user_id and role
    token = create_access_token(data={"sub": user.email, "role": user.role, "user_id": user.id})
    
    # Set HTTP-only cookie (secure + samesite=none required for cross-domain)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=True
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "prn_no": user.prn_no,
        "class_name": user.class_name
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
