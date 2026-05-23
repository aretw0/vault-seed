# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/devcontainers/base:bookworm

ENV LANG=pt_BR.UTF-8 \
    LC_ALL=pt_BR.UTF-8 \
    LANGUAGE=pt_BR:pt:en \
    TERM=xterm-256color \
    COLORTERM=truecolor

WORKDIR /workspaces/vault-seed

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash-completion \
    bubblewrap \
    ca-certificates \
    curl \
    fd-find \
    git-lfs \
    hyperfine \
    jq \
    locales \
    ripgrep \
    shellcheck \
    shfmt \
    tree \
    unzip \
  && sed -i 's/^# *pt_BR.UTF-8 UTF-8/pt_BR.UTF-8 UTF-8/' /etc/locale.gen \
  && locale-gen pt_BR.UTF-8 \
  && update-locale LANG=pt_BR.UTF-8 LC_ALL=pt_BR.UTF-8 LANGUAGE=pt_BR:pt:en \
  && ln -sf /usr/bin/fdfind /usr/local/bin/fd \
  && rm -rf /var/lib/apt/lists/*
