import socket, json
s = socket.socket()
s.settimeout(5)
try:
  s.connect(('127.0.0.1',5000))
  body = json.dumps({'channel':'Email','target':'test@test.com','content':'hi'}).encode()
  req = b'POST /api/automation/dispatch HTTP/1.1\r\nHost: localhost:5000\r\nContent-Type: application/json\r\nContent-Length: '+str(len(body)).encode()+b'\r\n\r\n'+body
  s.send(req)
  print(s.recv(2048).decode(errors='ignore'))
except Exception as e:
  print(e)
