#!/usr/bin/env python3
"""
Quick test to verify parser functionality
"""
import sys
import os

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_csv_parser():
    """Test CSV parser with sample data"""
    from core.services.parsers.csv_parser import CSVParser
    
    # Use test_small.csv as sample
    test_file = 'test_small.csv'
    
    if not os.path.exists(test_file):
        print(f"❌ Test file {test_file} not found")
        return False
    
    print(f"📄 Testing parser with: {test_file}")
    
    try:
        parser = CSVParser()
        events = parser.parse(test_file)
        
        print(f"✅ Successfully parsed {len(events)} events")
        
        if events:
            print("\n📋 Sample event (first):")
            first_event = events[0]
            for key, value in first_event.items():
                print(f"   {key}: {value}")
            
            # Verify required fields
            required_fields = ['timestamp', 'event_type', 'raw_message', 'line_number']
            missing_fields = [field for field in required_fields if field not in first_event]
            
            if missing_fields:
                print(f"\n⚠️  Missing required fields: {missing_fields}")
                return False
            else:
                print(f"\n✅ All required fields present")
                return True
        else:
            print("⚠️  No events parsed")
            return False
            
    except Exception as e:
        print(f"❌ Parser error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_parser_factory():
    """Test parser factory"""
    from core.services.parsers.factory import ParserFactory
    
    print("\n🏭 Testing Parser Factory:")
    
    # Test CSV parser
    csv_parser = ParserFactory.get_parser('CSV')
    if csv_parser:
        print("✅ CSV parser retrieved successfully")
    else:
        print("❌ Failed to get CSV parser")
        return False
    
    # Test SYSLOG parser
    syslog_parser = ParserFactory.get_parser('SYSLOG')
    if syslog_parser:
        print("✅ SYSLOG parser retrieved successfully")
    else:
        print("❌ Failed to get SYSLOG parser")
        return False
    
    # Test invalid parser
    invalid_parser = ParserFactory.get_parser('INVALID')
    if invalid_parser is None:
        print("✅ Correctly returns None for invalid parser")
    else:
        print("⚠️  Should return None for invalid parser")
    
    return True


def test_log_detection():
    """Test log type detection"""
    from core.services.log_detection import detect_log_type
    
    print("\n🔍 Testing Log Type Detection:")
    
    test_file = 'test_small.csv'
    
    if not os.path.exists(test_file):
        print(f"⚠️  Test file {test_file} not found")
        return True  # Skip this test
    
    try:
        log_type = detect_log_type(test_file, 'test_small.csv')
        print(f"✅ Detected log type: {log_type}")
        
        if log_type == 'CSV':
            print("✅ Correctly identified as CSV")
            return True
        else:
            print(f"⚠️  Expected CSV but got {log_type}")
            return False
    except Exception as e:
        print(f"❌ Log detection error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("🧪 PARSER FUNCTIONALITY TEST")
    print("=" * 60)
    
    results = []
    
    # Test 1: CSV Parser
    print("\n" + "=" * 60)
    print("TEST 1: CSV Parser")
    print("=" * 60)
    results.append(("CSV Parser", test_csv_parser()))
    
    # Test 2: Parser Factory
    print("\n" + "=" * 60)
    print("TEST 2: Parser Factory")
    print("=" * 60)
    results.append(("Parser Factory", test_parser_factory()))
    
    # Test 3: Log Detection
    print("\n" + "=" * 60)
    print("TEST 3: Log Detection")
    print("=" * 60)
    results.append(("Log Detection", test_log_detection()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed")
        sys.exit(1)
