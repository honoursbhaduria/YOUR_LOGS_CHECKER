FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including LaTeX for PDF generation
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libmagic1 \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create entrypoint script
RUN echo '#!/bin/bash\n\
python manage.py migrate --noinput\n\
python manage.py collectstatic --noinput\n\
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

EXPOSE 8000

CMD ["/app/entrypoint.sh"]
