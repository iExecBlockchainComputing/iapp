FROM python:3.15.0a2-alpine3.21
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY src/ ./src/
ENTRYPOINT ["python3", "/app/src/app.py"]
