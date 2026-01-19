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

# Copy and set permissions for entrypoint
RUN chmod +x /app/entrypoint.sh

# Render will override this with its own PORT
ENV PORT=10000

EXPOSE 10000

CMD ["/bin/bash", "entrypoint.sh"]
