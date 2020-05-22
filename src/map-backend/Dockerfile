# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

# Install production dependencies.
RUN pip install gpflow Flask gunicorn numpy pandas google-cloud-bigquery bokeh scipy matplotlib flask-cors

ENV PORT 5000
CMD [ "python", "backend.py" ]