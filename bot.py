import asyncio
import logging
import random
from os import getenv

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# --- НАСТРОЙКИ ---
BOT_TOKEN = getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("Не задана переменная окружения TELEGRAM_BOT_TOKEN")
# -----------------

logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- ОБРАБОТЧИКИ КОМАНД ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        f"Привет, {message.from_user.first_name}!\n"
        "Я бот этого уютного уголка. Вот что я умею:\n"
    )

ITEMS = [
    {"name": "обычное плохоефото", "chance": 47, "photo": "photos/rusty_key.jpg"},
    {"name": "редкое плохоефото", "chance": 28, "photo": "photos/rusty_key.jpg"},
    {"name": "эпическое плохоефото", "chance": 13, "photo": "photos/rusty_key.jpg"},
    {"name": "мифическое плохоефото", "chance": 7, "photo": "photos/rusty_key.jpg"},
    {"name": "сверхъестественное плохоефото", "chance": 4, "photo": "photos/rusty_key.jpg"},
    {"name": "божественное плохоефото", "chance": 1, "photo": "photos/rusty_key.jpg"}
]

# Закомментировано, пока собираете file_id
# @dp.message(Command("case"))
# async def cmd_case(message: types.Message):
#     item = random.choices(
#         ITEMS,
#         weights=[i["chance"] for i in ITEMS],
#         k=1
#     )[0]
#
#     caption = f"🎁 Вы получили: <b>{item['name']}</b>"
#     from aiogram.types import FSInputFile
#     photo = FSInputFile(item["photo"])
#     await message.answer_photo(
#         photo=photo,
#         caption=caption,
#         parse_mode="HTML"
#     )

@dp.message(lambda m: m.photo is not None)
async def get_photo_id(message: types.Message):
    photo = message.photo[-1]
    await message.answer(f"file_id:\n`{photo.file_id}`", parse_mode="Markdown")


async def main():
    print("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())