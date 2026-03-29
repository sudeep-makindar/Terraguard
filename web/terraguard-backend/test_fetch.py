import urllib.request
import json
import ssl

url = "http://172.16.41.167:6767/latest"
print(f"Testing fetch to {url}")
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=5) as response:
        print("Status:", response.status)
        data = response.read().decode()
        print("Result length:", len(data))
        print("Data:", data[:200])
except Exception as e:
    print(f"Error fetching: {e}")
