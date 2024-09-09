FROM python:3.8-slim

WORKDIR /movie_name

COPY . /movie_name

RUN pip3 install flask==2.1.0 werkzeug==2.1.1 flask-cors==4.0.1 sqlalchemy==1.4.22 python-dotenv

EXPOSE 5000

CMD ["python3", "-m", "server.api.app"]