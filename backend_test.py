#!/usr/bin/env python3
"""
Backend API Testing for Medical Equipment Maintenance System
Tests all CRUD operations and service generation functionality
"""

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, List, Any

class MedicalMaintenanceAPITester:
    def __init__(self, base_url="https://prevmaint-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            'clientes': [],
            'equipos': [],
            'servicios': []
        }

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}", 400
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, str(e), 0

    def test_api_health(self):
        """Test API root endpoint"""
        success, data, status = self.make_request('GET', '')
        expected_message = "Sistema de Mantenimiento Preventivo API"
        
        if success and isinstance(data, dict) and data.get('message') == expected_message:
            self.log_test("API Health Check", True, f"Status: {status}")
            return True
        else:
            self.log_test("API Health Check", False, f"Status: {status}, Data: {data}")
            return False

    def test_clientes_crud(self):
        """Test complete CRUD operations for clientes"""
        print("\n🔍 Testing Clientes CRUD Operations...")
        
        # Test GET empty list
        success, data, status = self.make_request('GET', 'clientes')
        self.log_test("GET Clientes (empty)", success, f"Status: {status}, Count: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test CREATE cliente
        cliente_data = {"nombre": "Hospital San Juan"}
        success, data, status = self.make_request('POST', 'clientes', cliente_data)
        
        if success and isinstance(data, dict) and 'id' in data:
            cliente_id = data['id']
            self.created_resources['clientes'].append(cliente_id)
            self.log_test("POST Cliente", True, f"Created cliente with ID: {cliente_id}")
        else:
            self.log_test("POST Cliente", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test GET cliente list (should have 1)
        success, data, status = self.make_request('GET', 'clientes')
        if success and isinstance(data, list) and len(data) == 1:
            self.log_test("GET Clientes (with data)", True, f"Found {len(data)} cliente(s)")
        else:
            self.log_test("GET Clientes (with data)", False, f"Expected 1 cliente, got: {data}")
        
        # Test UPDATE cliente
        updated_data = {"nombre": "Hospital San Juan Actualizado"}
        success, data, status = self.make_request('PUT', f'clientes/{cliente_id}', updated_data)
        
        if success and isinstance(data, dict) and data.get('nombre') == updated_data['nombre']:
            self.log_test("PUT Cliente", True, f"Updated cliente name to: {data.get('nombre')}")
        else:
            self.log_test("PUT Cliente", False, f"Status: {status}, Data: {data}")
        
        # Create second cliente for equipment testing
        cliente2_data = {"nombre": "Clínica Central"}
        success, data, status = self.make_request('POST', 'clientes', cliente2_data)
        if success and 'id' in data:
            self.created_resources['clientes'].append(data['id'])
        
        return True

    def test_equipos_crud_and_service_generation(self):
        """Test equipment CRUD and automatic service generation"""
        print("\n🔍 Testing Equipos CRUD and Service Generation...")
        
        if not self.created_resources['clientes']:
            self.log_test("Equipos Test Setup", False, "No clientes available for testing")
            return False
        
        cliente_id = self.created_resources['clientes'][0]
        
        # Test GET empty equipos
        success, data, status = self.make_request('GET', 'equipos')
        self.log_test("GET Equipos (empty)", success, f"Status: {status}, Count: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Test CREATE equipo with monthly periodicity
        equipo_data = {
            "modelo": "Monitor Signos Vitales MSV-2024",
            "numero_serie": "MSV-001-2024",
            "cliente_id": cliente_id,
            "periodicidad": "mensual",
            "en_garantia": True,
            "fecha_fin_garantia": "2025-12-31"
        }
        
        success, data, status = self.make_request('POST', 'equipos', equipo_data)
        
        if success and isinstance(data, dict) and 'id' in data:
            equipo_id = data['id']
            self.created_resources['equipos'].append(equipo_id)
            self.log_test("POST Equipo", True, f"Created equipo with ID: {equipo_id}")
            
            # Verify service generation - wait a moment for async operations
            import time
            time.sleep(1)
            
            # Check if services were generated
            success, servicios_data, status = self.make_request('GET', 'servicios')
            if success and isinstance(servicios_data, list):
                equipo_services = [s for s in servicios_data if s.get('equipo_id') == equipo_id]
                if len(equipo_services) > 0:
                    self.log_test("Service Auto-Generation", True, f"Generated {len(equipo_services)} services for monthly equipment")
                else:
                    self.log_test("Service Auto-Generation", False, "No services generated for equipment")
            else:
                self.log_test("Service Auto-Generation", False, f"Could not fetch services: {servicios_data}")
        else:
            self.log_test("POST Equipo", False, f"Status: {status}, Data: {data}")
            return False
        
        # Test CREATE equipo with different periodicity
        equipo2_data = {
            "modelo": "Ventilador Mecánico VM-Pro",
            "numero_serie": "VM-002-2024", 
            "cliente_id": cliente_id,
            "periodicidad": "trimestral",
            "en_garantia": False
        }
        
        success, data, status = self.make_request('POST', 'equipos', equipo2_data)
        if success and 'id' in data:
            self.created_resources['equipos'].append(data['id'])
            self.log_test("POST Equipo (trimestral)", True, f"Created trimestral equipo")
        
        # Test UPDATE equipo
        updated_equipo = {
            "modelo": "Monitor Signos Vitales MSV-2024 Pro",
            "numero_serie": "MSV-001-2024",
            "cliente_id": cliente_id,
            "periodicidad": "bimensual",  # Changed periodicity
            "en_garantia": True,
            "fecha_fin_garantia": "2025-12-31"
        }
        
        success, data, status = self.make_request('PUT', f'equipos/{equipo_id}', updated_equipo)
        if success and data.get('periodicidad') == 'bimensual':
            self.log_test("PUT Equipo (change periodicity)", True, "Updated equipment periodicity")
        else:
            self.log_test("PUT Equipo (change periodicity)", False, f"Status: {status}, Data: {data}")
        
        return True

    def test_servicios_endpoints(self):
        """Test service-related endpoints"""
        print("\n🔍 Testing Servicios Endpoints...")
        
        # Test GET all servicios
        success, data, status = self.make_request('GET', 'servicios')
        if success and isinstance(data, list):
            self.log_test("GET Servicios", True, f"Retrieved {len(data)} services")
            if len(data) > 0:
                # Store first service for authorization testing
                first_service = data[0]
                service_id = first_service.get('id')
                if service_id:
                    self.created_resources['servicios'].append(service_id)
        else:
            self.log_test("GET Servicios", False, f"Status: {status}, Data: {data}")
        
        # Test GET próximos servicios
        success, data, status = self.make_request('GET', 'servicios/proximos')
        if success and isinstance(data, list):
            self.log_test("GET Próximos Servicios", True, f"Retrieved {len(data)} upcoming services")
        else:
            self.log_test("GET Próximos Servicios", False, f"Status: {status}, Data: {data}")
        
        # Test calendar endpoint for current month
        current_date = datetime.now()
        year = current_date.year
        month = current_date.month
        
        success, data, status = self.make_request('GET', f'calendario/{year}/{month}')
        if success and isinstance(data, list):
            self.log_test("GET Calendario Mensual", True, f"Retrieved {len(data)} services for {year}/{month}")
        else:
            self.log_test("GET Calendario Mensual", False, f"Status: {status}, Data: {data}")
        
        # Test service authorization
        if self.created_resources['servicios']:
            service_id = self.created_resources['servicios'][0]
            
            # Authorize service
            success, data, status = self.make_request('PUT', f'servicios/{service_id}/autorizar', params={'autorizado': 'true'})
            if success:
                self.log_test("PUT Autorizar Servicio", True, "Service authorized successfully")
                
                # Unauthorize service
                success, data, status = self.make_request('PUT', f'servicios/{service_id}/autorizar', params={'autorizado': 'false'})
                if success:
                    self.log_test("PUT Desautorizar Servicio", True, "Service unauthorized successfully")
                else:
                    self.log_test("PUT Desautorizar Servicio", False, f"Status: {status}")
            else:
                self.log_test("PUT Autorizar Servicio", False, f"Status: {status}, Data: {data}")
        
        return True

    def test_data_validation(self):
        """Test data validation and error handling"""
        print("\n🔍 Testing Data Validation...")
        
        # Test creating equipo with non-existent cliente
        invalid_equipo = {
            "modelo": "Test Equipment",
            "numero_serie": "TEST-001",
            "cliente_id": "non-existent-id",
            "periodicidad": "mensual",
            "en_garantia": False
        }
        
        success, data, status = self.make_request('POST', 'equipos', invalid_equipo)
        if not success and status == 404:
            self.log_test("Validation: Non-existent Cliente", True, "Correctly rejected invalid cliente_id")
        else:
            self.log_test("Validation: Non-existent Cliente", False, f"Should have failed with 404, got {status}")
        
        # Test updating non-existent cliente
        success, data, status = self.make_request('PUT', 'clientes/non-existent-id', {"nombre": "Test"})
        if not success and status == 404:
            self.log_test("Validation: Update Non-existent Cliente", True, "Correctly rejected non-existent cliente")
        else:
            self.log_test("Validation: Update Non-existent Cliente", False, f"Should have failed with 404, got {status}")
        
        # Test deleting cliente with associated equipos
        if self.created_resources['clientes'] and self.created_resources['equipos']:
            cliente_id = self.created_resources['clientes'][0]
            success, data, status = self.make_request('DELETE', f'clientes/{cliente_id}')
            if not success and status == 400:
                self.log_test("Validation: Delete Cliente with Equipos", True, "Correctly prevented deletion of cliente with equipos")
            else:
                self.log_test("Validation: Delete Cliente with Equipos", False, f"Should have failed with 400, got {status}")

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete equipos first (to remove foreign key constraints)
        for equipo_id in self.created_resources['equipos']:
            success, _, status = self.make_request('DELETE', f'equipos/{equipo_id}')
            if success:
                print(f"    Deleted equipo: {equipo_id}")
        
        # Delete clientes
        for cliente_id in self.created_resources['clientes']:
            success, _, status = self.make_request('DELETE', f'clientes/{cliente_id}')
            if success:
                print(f"    Deleted cliente: {cliente_id}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Medical Maintenance API Tests")
        print(f"Testing against: {self.api_url}")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API health check failed. Stopping tests.")
            return False
        
        # Run all test suites
        try:
            self.test_clientes_crud()
            self.test_equipos_crud_and_service_generation()
            self.test_servicios_endpoints()
            self.test_data_validation()
        except Exception as e:
            print(f"❌ Test execution error: {str(e)}")
            return False
        finally:
            # Always try to cleanup
            try:
                self.cleanup_test_data()
            except:
                pass
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_report(self):
        """Get detailed test report"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = MedicalMaintenanceAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed report
        report = tester.get_test_report()
        with open('/app/backend_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())