"""
Custom exception classes for the application.
"""


class AppException(Exception):
    """Base exception class for application-specific errors."""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class DatabaseError(AppException):
    """Raised when database operations fail."""
    
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, status_code=503)


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ValidationError(AppException):
    """Raised when input validation fails."""
    
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=400)


class AuthenticationError(AppException):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(AppException):
    """Raised when authorization fails."""
    
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, status_code=403)


class ConflictError(AppException):
    """Raised when a resource conflict occurs (e.g., duplicate unique value)."""
    
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, status_code=409)

