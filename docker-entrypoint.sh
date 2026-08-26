#!/bin/sh
#
# Production ishga tushirish zanjiri: avval migratsiya, keyin ilova.
#
# NEGA SKRIPT: bu mantiq ilgari Render'ning "Docker Command" maydonida turardi
# (`sh -c "migratsiya || echo …; ilova"`). Render u matnni ishonchsiz parse
# qiladi — 2026-08-25/26 da uch marta yiqildi: ikki marta `sh -c` o'rami
# tushib qolgani uchun (shell operatorlari `node`ga argument bo'lib ketdi),
# bir marta esa butun satrni bitta buyruq nomi deb qabul qilgani uchun
# (`exit 127`). Zanjir shu faylga ko'chirilgach, Render UI'da hech qanday
# murakkab sintaksis qolmaydi: Docker Command bo'sh, Dockerfile CMD ishlaydi.
#
# MIGRATION_STRICT=true bo'lsa — migratsiya yiqilsa ilova ATAYLAB ishga
# tushmaydi (fail-fast). Shunda "kod yangi, sxema eski" yarim holati paydo
# bo'lmaydi: Render eski, ishlaydigan versiyani o'z o'rnida qoldiradi.
# Standart `false` — migratsiya yiqilsa ham ilova ko'tariladi.
set -eu

echo "[entrypoint] Migratsiya bosqichi boshlandi"

if node dist/src/database/migrate-prod.js; then
  echo "[entrypoint] Migratsiya bosqichi tugadi"
else
  kod=$?
  echo ">>> MIGRATSIYA ISHLAMADI (chiqish kodi: ${kod})"
  if [ "${MIGRATION_STRICT:-false}" = "true" ]; then
    echo ">>> MIGRATION_STRICT=true — ilova ataylab ishga tushirilmaydi"
    exit "${kod}"
  fi
  echo ">>> MIGRATION_STRICT o'rnatilmagan — ilova baribir ishga tushadi"
fi

# `exec` — PID 1 node'ga o'tadi, ya'ni Render'ning SIGTERM signali to'g'ridan
# to'g'ri ilovaga yetadi va graceful shutdown ishlaydi.
exec node dist/src/main.js
