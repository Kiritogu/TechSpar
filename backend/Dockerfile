FROM python:3.11-slim

WORKDIR /app

# 构建加速镜像源,默认走国内镜像(国内服务器构建飞快)。
# 海外服务器想用官方源: docker build --build-arg APT_MIRROR= --build-arg PIP_INDEX_URL= ...
ARG APT_MIRROR="mirrors.aliyun.com"
ARG PIP_INDEX_URL="https://pypi.tuna.tsinghua.edu.cn/simple"

# 把 Debian 源换成国内镜像(兼容 trixie 的 deb822 与旧 list 两种格式)
RUN if [ -n "$APT_MIRROR" ]; then \
      sed -i "s|deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null \
      || sed -i "s|deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list; \
    fi

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN if [ -n "$PIP_INDEX_URL" ]; then \
      pip install --no-cache-dir -i "$PIP_INDEX_URL" -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY backend/ backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
