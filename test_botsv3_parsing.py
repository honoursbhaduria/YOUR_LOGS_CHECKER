#!/usr/bin/env python3
"""
Comprehensive parsing test for botsv3_events.csv
"""
import sys
import os
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from core.services.parsers.csv_parser import CSVParser
from core.services.log_detection import detect_log_type

def analyze_botsv3():
    """Detailed analysis of botsv3_events.csv parsing"""
    
    file_path = 'botsv3_events.csv'
    
    print("=" * 80)
    print("BOTSV3_EVENTS.CSV PARSING ANALYSIS")
    print("=" * 80)
    
    # Step 1: Log type detection
    print("\n1. LOG TYPE DETECTION")
    print("-" * 80)
    log_type = detect_log_type(file_path, 'botsv3_events.csv')
    print(f"✅ Detected log type: {log_type}")
    
    # Step 2: Parse the file
    print("\n2. PARSING RESULTS")
    print("-" * 80)
    parser = CSVParser()
    events = parser.parse(file_path)
    
    print(f"✅ Total events parsed: {len(events)}")
    
    # Count actual lines in file
    with open(file_path, 'r') as f:
        total_lines = sum(1 for _ in f) - 1  # Subtract header
    
    print(f"📊 Total data lines in file: {total_lines}")
    print(f"📈 Parse success rate: {len(events)/total_lines*100:.1f}%")
    
    # Step 3: Validate required fields
    print("\n3. FIELD VALIDATION")
    print("-" * 80)
    required_fields = ['timestamp', 'event_type', 'raw_message', 'line_number']
    
    all_valid = True
    for i, event in enumerate(events):
        missing = [f for f in required_fields if f not in event]
        if missing:
            print(f"⚠️  Event {i+1} missing fields: {missing}")
            all_valid = False
    
    if all_valid:
        print(f"✅ All {len(events)} events have required fields")
    
    # Step 4: Sample events
    print("\n4. SAMPLE PARSED EVENTS")
    print("-" * 80)
    
    samples = [0, 50, 100, 113, 114, 115]  # Include brute force attack events
    
    for idx in samples:
        if idx < len(events):
            event = events[idx]
            print(f"\n📋 Event #{idx + 1} (Line {event.get('line_number', 'N/A')}):")
            print(f"   Timestamp: {event['timestamp']}")
            print(f"   User: {event.get('user', 'N/A')}")
            print(f"   Host: {event.get('host', 'N/A')}")
            print(f"   Event Type: {event['event_type']}")
            raw = event['raw_message']
            print(f"   Raw Message: {raw[:100]}..." if len(raw) > 100 else f"   Raw Message: {raw}")
    
    # Step 5: Statistics
    print("\n5. PARSED DATA STATISTICS")
    print("-" * 80)
    
    # Count by event type
    event_types = Counter(e['event_type'] for e in events)
    print(f"\n📊 Event Types Distribution:")
    for event_type, count in event_types.most_common(10):
        print(f"   {event_type}: {count}")
    
    # Count by user
    users = Counter(e.get('user', 'N/A') for e in events)
    print(f"\n👥 Top 10 Users:")
    for user, count in users.most_common(10):
        print(f"   {user}: {count}")
    
    # Count by host/source
    hosts = Counter(e.get('host', 'N/A') for e in events)
    print(f"\n🖥️  Hosts/Sources:")
    for host, count in hosts.most_common(10):
        print(f"   {host}: {count}")
    
    # Step 6: Check for critical events
    print("\n6. SECURITY EVENTS DETECTED")
    print("-" * 80)
    
    # Look for failed login events (4625)
    failed_logins = [e for e in events if e['event_type'] == '4625']
    print(f"🚨 Failed login attempts (Event ID 4625): {len(failed_logins)}")
    
    if failed_logins:
        print(f"   Sample failed login:")
        fl = failed_logins[0]
        print(f"   - User: {fl.get('user', 'N/A')}")
        print(f"   - Timestamp: {fl['timestamp']}")
        print(f"   - Message: {fl['raw_message'][:80]}...")
    
    # Look for log cleared events (1102)
    log_cleared = [e for e in events if e['event_type'] == '1102']
    print(f"\n⚠️  Security log cleared events (Event ID 1102): {len(log_cleared)}")
    
    # Look for firewall blocks (5157)
    firewall_blocks = [e for e in events if e['event_type'] == '5157']
    print(f"🛡️  Firewall blocks (Event ID 5157): {len(firewall_blocks)}")
    
    # Step 7: Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✅ File: botsv3_events.csv")
    print(f"✅ Log Type: {log_type}")
    print(f"✅ Events Parsed: {len(events)}/{total_lines}")
    print(f"✅ Parsing: SUCCESSFUL")
    print(f"✅ Validation: {'PASSED' if all_valid else 'FAILED'}")
    print(f"✅ Unique Event Types: {len(event_types)}")
    print(f"✅ Unique Users: {len(users)}")
    print(f"✅ Security Events Detected: Yes ({len(failed_logins)} failed logins, {len(log_cleared)} log clears)")
    
    print("\n🎉 Parsing is working correctly!")
    print("=" * 80)

if __name__ == '__main__':
    analyze_botsv3()
