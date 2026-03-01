#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for ShareIt Clone
Tests all backend endpoints in proper sequence flow
"""
import requests
import json
import base64
from datetime import datetime
import time

# Configuration
BASE_URL = "https://instant-share-30.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class ShareItBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_id = None
        self.session_code = None
        self.file_id = None
        self.test_results = {}
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        self.test_results[test_name] = {
            'success': success,
            'message': message,
            'response_data': response_data,
            'timestamp': datetime.now().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")

    def test_health_check(self):
        """Test GET /api/health"""
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_result('health_check', True, f"Health check passed - {data}")
                else:
                    self.log_result('health_check', False, f"Invalid health response: {data}", data)
            else:
                self.log_result('health_check', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('health_check', False, f"Exception: {str(e)}")

    def test_create_session(self):
        """Test POST /api/session/create"""
        try:
            payload = {"device_id": "test-receiver-device-123"}
            
            response = self.session.post(
                f"{API_BASE}/session/create",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'session' in data:
                    session = data['session']
                    self.session_id = session.get('id')
                    self.session_code = session.get('code')
                    
                    # Validate session code format (6 digits)
                    if self.session_code and len(self.session_code) == 6 and self.session_code.isdigit():
                        self.log_result('create_session', True, 
                                      f"Session created: ID={self.session_id}, Code={self.session_code}")
                    else:
                        self.log_result('create_session', False, 
                                      f"Invalid session code format: {self.session_code}", data)
                else:
                    self.log_result('create_session', False, f"Invalid response structure: {data}", data)
            else:
                self.log_result('create_session', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('create_session', False, f"Exception: {str(e)}")

    def test_join_session(self):
        """Test POST /api/session/join"""
        if not self.session_code:
            self.log_result('join_session', False, "No session code available from create_session test")
            return
            
        try:
            payload = {
                "code": self.session_code,
                "device_id": "test-sender-device-456"
            }
            
            response = self.session.post(
                f"{API_BASE}/session/join",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'session' in data:
                    session = data['session']
                    if session.get('status') == 'connected':
                        self.log_result('join_session', True, 
                                      f"Successfully joined session {self.session_code}")
                    else:
                        self.log_result('join_session', False, 
                                      f"Session status not 'connected': {session.get('status')}", data)
                else:
                    self.log_result('join_session', False, f"Invalid response structure: {data}", data)
            else:
                self.log_result('join_session', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('join_session', False, f"Exception: {str(e)}")

    def test_session_status(self):
        """Test GET /api/session/{session_id}/status"""
        if not self.session_id:
            self.log_result('session_status', False, "No session ID available")
            return
            
        try:
            response = self.session.get(
                f"{API_BASE}/session/{self.session_id}/status",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'code', 'status', 'file_count', 'has_sender']
                
                if all(field in data for field in required_fields):
                    if data['has_sender'] and data['status'] in ['connected', 'transferring']:
                        self.log_result('session_status', True, 
                                      f"Status: {data['status']}, Files: {data['file_count']}, Has sender: {data['has_sender']}")
                    else:
                        self.log_result('session_status', False, 
                                      f"Session not properly connected - Status: {data.get('status')}, Has sender: {data.get('has_sender')}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result('session_status', False, f"Missing fields: {missing}", data)
            else:
                self.log_result('session_status', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('session_status', False, f"Exception: {str(e)}")

    def test_file_upload(self):
        """Test POST /api/file/upload"""
        if not self.session_id:
            self.log_result('file_upload', False, "No session ID available")
            return
            
        try:
            # Create test file data
            test_content = "Hello World! This is a test file for ShareIt Clone."
            test_data_base64 = base64.b64encode(test_content.encode()).decode()
            
            payload = {
                "session_id": self.session_id,
                "filename": "test_document.txt",
                "file_type": "text/plain",
                "file_size": len(test_content),
                "data": test_data_base64
            }
            
            response = self.session.post(
                f"{API_BASE}/file/upload",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'file' in data:
                    file_info = data['file']
                    self.file_id = file_info.get('id')
                    
                    if self.file_id and file_info.get('filename') == 'test_document.txt':
                        self.log_result('file_upload', True, 
                                      f"File uploaded: ID={self.file_id}, Name={file_info.get('filename')}, Size={file_info.get('file_size')}")
                    else:
                        self.log_result('file_upload', False, f"Invalid file info: {file_info}", data)
                else:
                    self.log_result('file_upload', False, f"Invalid response structure: {data}", data)
            else:
                self.log_result('file_upload', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('file_upload', False, f"Exception: {str(e)}")

    def test_get_session_files(self):
        """Test GET /api/session/{session_id}/files"""
        if not self.session_id:
            self.log_result('get_session_files', False, "No session ID available")
            return
            
        try:
            response = self.session.get(
                f"{API_BASE}/session/{self.session_id}/files",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'files' in data and isinstance(data['files'], list):
                    files = data['files']
                    if len(files) > 0:
                        # Check if our uploaded file is there
                        test_file = next((f for f in files if f.get('filename') == 'test_document.txt'), None)
                        if test_file:
                            required_fields = ['id', 'filename', 'file_type', 'file_size', 'uploaded_at', 'downloaded']
                            if all(field in test_file for field in required_fields):
                                self.log_result('get_session_files', True, 
                                              f"Found {len(files)} file(s), including our test file")
                            else:
                                missing = [f for f in required_fields if f not in test_file]
                                self.log_result('get_session_files', False, f"File missing fields: {missing}", data)
                        else:
                            self.log_result('get_session_files', False, 
                                          f"Test file not found in {len(files)} files", data)
                    else:
                        self.log_result('get_session_files', False, "No files found in session", data)
                else:
                    self.log_result('get_session_files', False, f"Invalid response structure: {data}", data)
            else:
                self.log_result('get_session_files', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('get_session_files', False, f"Exception: {str(e)}")

    def test_download_file(self):
        """Test GET /api/file/{file_id}"""
        if not self.file_id:
            self.log_result('download_file', False, "No file ID available")
            return
            
        try:
            response = self.session.get(
                f"{API_BASE}/file/{self.file_id}",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'filename', 'file_type', 'file_size', 'data']
                
                if all(field in data for field in required_fields):
                    # Verify the file content
                    try:
                        decoded_content = base64.b64decode(data['data']).decode()
                        expected_content = "Hello World! This is a test file for ShareIt Clone."
                        
                        if decoded_content == expected_content:
                            self.log_result('download_file', True, 
                                          f"File downloaded successfully: {data['filename']} ({data['file_size']} bytes)")
                        else:
                            self.log_result('download_file', False, 
                                          f"Content mismatch. Expected: '{expected_content}', Got: '{decoded_content}'", data)
                    except Exception as decode_error:
                        self.log_result('download_file', False, f"Failed to decode file content: {decode_error}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result('download_file', False, f"Missing fields: {missing}", data)
            else:
                self.log_result('download_file', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('download_file', False, f"Exception: {str(e)}")

    def test_delete_session(self):
        """Test DELETE /api/session/{session_id}"""
        if not self.session_id:
            self.log_result('delete_session', False, "No session ID available")
            return
            
        try:
            response = self.session.delete(
                f"{API_BASE}/session/{self.session_id}",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Verify session is really deleted by trying to get status
                    verify_response = self.session.get(
                        f"{API_BASE}/session/{self.session_id}/status",
                        timeout=10
                    )
                    
                    if verify_response.status_code == 404:
                        self.log_result('delete_session', True, 
                                      f"Session {self.session_id} deleted successfully")
                    else:
                        self.log_result('delete_session', False, 
                                      f"Session still exists after deletion (status: {verify_response.status_code})", data)
                else:
                    self.log_result('delete_session', False, f"Delete not successful: {data}", data)
            else:
                self.log_result('delete_session', False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result('delete_session', False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("SHAREITT CLONE BACKEND API TESTS")
        print("=" * 60)
        print(f"Testing API at: {API_BASE}")
        print()
        
        # Test sequence as specified in requirements
        test_methods = [
            self.test_health_check,
            self.test_create_session,
            self.test_join_session,
            self.test_session_status,
            self.test_file_upload,
            self.test_get_session_files,
            self.test_download_file,
            self.test_delete_session
        ]
        
        for test_method in test_methods:
            test_method()
            time.sleep(0.5)  # Small delay between tests
        
        print()
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for test_name, result in self.test_results.items():
                if not result['success']:
                    print(f"  ❌ {test_name}: {result['message']}")
        
        return failed_tests == 0

def main():
    """Main test function"""
    tester = ShareItBackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2, default=str)
    
    print(f"\nDetailed results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())