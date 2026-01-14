#!/usr/bin/env python3
"""
Detailed CSV parser inspection
"""
import sys
import os
import csv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def inspect_csv():
    """Inspect CSV file in detail"""
    test_file = 'test_small.csv'
    
    print("=" * 60)
    print("CSV FILE INSPECTION")
    print("=" * 60)
    
    # Check raw content
    print("\n📄 Raw file content:")
    with open(test_file, 'r') as f:
        for i, line in enumerate(f, 1):
            print(f"Line {i}: {line[:80]}..." if len(line) > 80 else f"Line {i}: {line.rstrip()}")
            if i >= 5:
                break
    
    # Check CSV parsing
    print("\n📋 CSV Parsing Test:")
    with open(test_file, 'r', encoding='utf-8', errors='ignore') as f:
        sample = f.read(1024)
        f.seek(0)
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample)
        
        print(f"   Delimiter: '{dialect.delimiter}'")
        print(f"   Quotechar: '{dialect.quotechar}'")
        print(f"   Line terminator: {repr(dialect.lineterminator)}")
        
        f.seek(0)
        reader = csv.DictReader(f, dialect=dialect)
        
        print(f"\n   Header fields: {reader.fieldnames}")
        
        for i, row in enumerate(reader, 1):
            print(f"\n   Row {i}:")
            for key, value in row.items():
                print(f"      {key}: {value}")
            if i >= 2:
                break
    
    # Test the actual parser
    print("\n\n🔧 Testing CSVParser class:")
    from core.services.parsers.csv_parser import CSVParser
    
    parser = CSVParser()
    events = parser.parse(test_file)
    
    print(f"   Parsed {len(events)} events")
    
    if events:
        print("\n   First event details:")
        event = events[0]
        for key, value in event.items():
            if key == 'raw_message':
                display = value[:100] + "..." if len(value) > 100 else value
                print(f"      {key}: {display}")
            else:
                print(f"      {key}: {value}")

if __name__ == '__main__':
    inspect_csv()
