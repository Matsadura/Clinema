# syntax=docker/dockerfile:1
# Clinema API — multi-stage production image
ARG PYTHON_IMAGE=python:3.12.16-slim-bookworm

# ---- Build stage: resolve dependencies into an isolated virtualenv --------
FROM ${PYTHON_IMAGE} AS builder
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
COPY requirements.txt /tmp/requirements.txt
# pip itself isn't needed at runtime
RUN pip install -r /tmp/requirements.txt \
 && pip uninstall -y pip

# ---- Runtime stage: only the venv and application code -------------------
FROM ${PYTHON_IMAGE} AS runtime
LABEL org.opencontainers.image.title="clinema-api" \
      org.opencontainers.image.source="https://github.com/Matsadura/Clinema"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/opt/venv/bin:$PATH \
    APP_ENV=production \
    # Writable scratch space when the root filesystem is read-only (tmpfs)
    HOME=/tmp

RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY gunicorn.conf.py alembic.ini ./
COPY migrations ./migrations
COPY api ./api
COPY models ./models

USER app
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=4).status == 200 else 1)"]

CMD ["gunicorn", "--config", "gunicorn.conf.py", "api.app:create_app()"]
