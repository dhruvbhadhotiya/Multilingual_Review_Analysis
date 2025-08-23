import os
import re
import csv
import logging
from typing import List, Dict, Any, Generator, Union, Optional
from pathlib import Path
import json

logger = logging.getLogger(__name__)

def chunk_text(text: str, 
              chunk_size: int = 1000, 
              overlap: int = 100,
              min_chunk_size: int = 50) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks of specified size.
    
    Args:
        text: The input text to chunk
        chunk_size: Maximum size of each chunk (in characters)
        overlap: Number of characters to overlap between chunks
        min_chunk_size: Minimum size of a chunk (smaller chunks will be discarded)
        
    Returns:
        List of dictionaries containing chunk text and metadata
    """
    if not text or not text.strip():
        return []
        
    # Clean up the text
    text = text.strip()
    chunks = []
    
    # If text is smaller than chunk size, return as a single chunk
    if len(text) <= chunk_size:
        return [{
            'text': text,
            'chunk_id': 0,
            'start': 0,
            'end': len(text),
            'is_last': True
        }]
    
    # Split text into sentences first for better chunking
    sentences = re.split(r'(?<=[.!?])\s+', text)
    current_chunk = []
    current_length = 0
    chunk_id = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # If adding this sentence would exceed chunk size, finalize current chunk
        if current_length + len(sentence) > chunk_size and current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append({
                'text': chunk_text,
                'chunk_id': chunk_id,
                'start': text.find(chunk_text),
                'end': text.find(chunk_text) + len(chunk_text),
                'is_last': False
            })
            chunk_id += 1
            
            # Keep the overlap for the next chunk
            overlap_text = ' '.join(current_chunk[-overlap//50:] if len(current_chunk) > overlap//50 else current_chunk)
            current_chunk = [overlap_text, sentence] if overlap_text != sentence else [sentence]
            current_length = len(' '.join(current_chunk))
        else:
            current_chunk.append(sentence)
            current_length += len(sentence) + 1  # +1 for the space
    
    # Add the last chunk if it meets minimum size
    if current_chunk:
        chunk_text = ' '.join(current_chunk)
        if len(chunk_text) >= min_chunk_size:
            chunks.append({
                'text': chunk_text,
                'chunk_id': chunk_id,
                'start': text.find(chunk_text),
                'end': text.find(chunk_text) + len(chunk_text),
                'is_last': True
            })
    
    # Update is_last for the actual last chunk
    if chunks:
        chunks[-1]['is_last'] = True
        
    return chunks

def process_file(file_path: Union[str, Path], 
                chunk_size: int = 1000,
                overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Process a file and split its content into chunks.
    
    Args:
        file_path: Path to the file to process
        chunk_size: Maximum size of each chunk (in characters)
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of chunks with metadata
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Determine file type and process accordingly
    if file_path.suffix.lower() == '.csv':
        return process_csv_file(file_path, chunk_size, overlap)
    elif file_path.suffix.lower() == '.json':
        return process_json_file(file_path, chunk_size, overlap)
    else:  # Treat as plain text
        return process_text_file(file_path, chunk_size, overlap)

def process_text_file(file_path: Union[str, Path], 
                     chunk_size: int = 1000,
                     overlap: int = 100) -> List[Dict[str, Any]]:
    """Process a plain text file into chunks, treating each line as a separate review."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Process each line as a separate review
        chunks = []
        for i, line in enumerate(lines):
            line = line.strip()
            if line:  # Skip empty lines
                chunks.append({
                    'text': line,
                    'chunk_id': i,
                    'start': 0,
                    'end': len(line),
                    'is_last': i == len(lines) - 1,
                    'line_number': i + 1
                })
        
        return chunks
        
    except Exception as e:
        logger.error(f"Error processing text file {file_path}: {str(e)}")
        raise

def process_csv_file(file_path: Union[str, Path],
                    chunk_size: int = 1000,
                    overlap: int = 100) -> List[Dict[str, Any]]:
    """Process a CSV file into chunks, preserving row structure."""
    try:
        chunks = []
        current_chunk = []
        current_length = 0
        chunk_id = 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for i, row in enumerate(reader):
                # Convert row to a readable string
                row_text = ', '.join(f"{k}: {v}" for k, v in row.items())
                
                # If adding this row would exceed chunk size, finalize current chunk
                if current_length + len(row_text) > chunk_size and current_chunk:
                    chunk_content = '\n'.join(current_chunk)
                    chunks.append({
                        'text': chunk_content,
                        'chunk_id': chunk_id,
                        'start_row': i - len(current_chunk),
                        'end_row': i - 1,
                        'is_last': False,
                        'format': 'csv',
                        'headers': list(reader.fieldnames) if reader.fieldnames else []
                    })
                    chunk_id += 1
                    current_chunk = [row_text]
                    current_length = len(row_text)
                else:
                    current_chunk.append(row_text)
                    current_length += len(row_text) + 1  # +1 for newline
        
        # Add the last chunk if not empty
        if current_chunk:
            chunk_content = '\n'.join(current_chunk)
            chunks.append({
                'text': chunk_content,
                'chunk_id': chunk_id,
                'start_row': (i + 1) - len(current_chunk) if 'i' in locals() else 0,
                'end_row': i if 'i' in locals() else len(current_chunk) - 1,
                'is_last': True,
                'format': 'csv',
                'headers': list(reader.fieldnames) if 'reader' in locals() and reader.fieldnames else []
            })
        
        return chunks
        
    except Exception as e:
        logger.error(f"Error processing CSV file {file_path}: {str(e)}")
        raise

def process_json_file(file_path: Union[str, Path],
                     chunk_size: int = 1000,
                     overlap: int = 100) -> List[Dict[str, Any]]:
    """Process a JSON file into chunks."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Convert JSON to text representation
        if isinstance(data, list):
            # If it's an array of objects, process each object
            text_content = '\n'.join(json.dumps(item, ensure_ascii=False) for item in data)
        else:
            # If it's a single object
            text_content = json.dumps(data, ensure_ascii=False, indent=2)
        
        return chunk_text(text_content, chunk_size, overlap)
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in file {file_path}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error processing JSON file {file_path}: {str(e)}")
        raise

def merge_chunks(chunks: List[Dict[str, Any]]) -> str:
    """
    Merge chunks back into the original text.
    
    Args:
        chunks: List of chunks from chunk_text()
        
    Returns:
        str: Reconstructed original text
    """
    if not chunks:
        return ""
    
    # Sort chunks by their start position
    sorted_chunks = sorted(chunks, key=lambda x: x.get('start', 0))
    
    # For chunks without position info, just concatenate
    if 'start' not in sorted_chunks[0]:
        return '\n\n'.join(chunk['text'] for chunk in sorted_chunks)
    
    # Reconstruct text using position information
    result = []
    last_end = 0
    
    for chunk in sorted_chunks:
        start = chunk.get('start', last_end)
        # Add padding if there's a gap between chunks
        if start > last_end:
            result.append(' ' * (start - last_end))
        result.append(chunk['text'])
        last_end = chunk.get('end', start + len(chunk['text']))
    
    return ''.join(result)

# Example usage
if __name__ == "__main__":
    # Test with sample text
    sample_text = """This is a sample text that will be split into multiple chunks. 
    Each chunk should be of a reasonable size and may overlap with adjacent chunks. 
    This helps in maintaining context when processing the chunks independently."""
    
    print("Testing text chunking:")
    chunks = chunk_text(sample_text, chunk_size=50, overlap=10)
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i + 1} (Chars: {len(chunk['text'])}):")
        print(f"{chunk['text']}")
        print(f"Position: {chunk.get('start', '?')}-{chunk.get('end', '?')}")
    
    # Test reconstruction
    print("\nReconstructed text:")
    print(merge_chunks(chunks))
