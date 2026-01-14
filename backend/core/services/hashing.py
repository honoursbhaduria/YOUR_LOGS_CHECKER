"""
File hashing service for chain of custody
Implements cryptographic verification
"""
import hashlib
from typing import BinaryIO


def calculate_sha256(file_obj: BinaryIO) -> str:
    """
    Calculate SHA-256 hash of a file object
    
    Args:
        file_obj: File object to hash
        
    Returns:
        Hexadecimal hash string
    """
    sha256_hash = hashlib.sha256()
    
    # Read file in chunks to handle large files
    for byte_block in iter(lambda: file_obj.read(4096), b""):
        sha256_hash.update(byte_block)
    
    # Reset file pointer for subsequent operations
    file_obj.seek(0)
    
    return sha256_hash.hexdigest()


def verify_hash(file_obj: BinaryIO, expected_hash: str) -> bool:
    """
    Verify file integrity by comparing hashes
    
    Args:
        file_obj: File object to verify
        expected_hash: Expected SHA-256 hash
        
    Returns:
        True if hash matches, False otherwise
    """
    actual_hash = calculate_sha256(file_obj)
    return actual_hash == expected_hash


def calculate_string_hash(content: str) -> str:
    """
    Calculate SHA-256 hash of string content
    
    Args:
        content: String content to hash
        
    Returns:
        Hexadecimal hash string
    """
    return hashlib.sha256(content.encode('utf-8')).hexdigest()
