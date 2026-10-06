import math
import re
import unicodedata
from collections import defaultdict
from datetime import date, datetime, timedelta
from io import BytesIO
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field
from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.sale import Sale


router = APIRouter(
    prefix="/api/ai",
    tags=["AI & Voice"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class CommandRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    shop_id: int = Field(default=1, gt=0)


# ============================================================
# PRODUCT ALIASES
# Expand these after real testing.
# ============================================================

PRODUCT_ALIASES = {
    "milk powder": [
        "milk powder",
        "milk packet",
        "பால் மா",
        "பால் பவுடர்",
        "කිරි පිටි",
    ],

    "biscuits": [
        "biscuits",
        "biscuit",
        "பிஸ்கட்",
        "බිස්කට්",
    ],

    "soap": [
        "soap",
        "சோப்பு",
        "සබන්",
    ],

    "rice": [
        "rice",
        "அரிசி",
        "හාල්",
    ],

    "sugar": [
        "sugar",
        "சீனி",
        "சர்க்கரை",
        "සීනි",
    ],

    "tea": [
        "tea",
        "டீ",
        "தேநீர்",
        "තේ",
    ],

    "dhal": [
        "dhal",
        "dal",
        "பருப்பு",
        "පරිප්පු",
    ],
}


# ============================================================
# NUMBERS
# ============================================================

NUMBER_WORDS = {

    # English
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,

    # Tamil
    "ஒன்று": 1,
    "ஒரு": 1,
    "ஒன்னு": 1,

    "இரண்டு": 2,
    "ரெண்டு": 2,

    "மூன்று": 3,
    "மூணு": 3,

    "நான்கு": 4,
    "நாலு": 4,

    "ஐந்து": 5,
    "அஞ்சு": 5,

    "ஆறு": 6,
    "ஆர்": 6,
    "ஏழு": 7,
    "எட்டு": 8,
    "ஒன்பது": 9,
    "பத்து": 10,

    # Sinhala
    "එක": 1,
    "එකක්": 1,
    "එක්": 1,

    "දෙක": 2,
    "දෙකක්": 2,

    "තුන": 3,
    "තුනක්": 3,

    "හතර": 4,
    "හතරක්": 4,

    "පහ": 5,
    "පහක්": 5,

    "හය": 6,
    "හයක්": 6,

    "හත": 7,
    "හතක්": 7,

    "අට": 8,
    "අටක්": 8,

    "නවය": 9,
    "නවයක්": 9,

    "දහය": 10,
    "දහයක්": 10,
}


SALE_WORDS = [
    # English
    "sold",
    "sell",
    "sale",

    # Tamil - expected forms
    "விற்றேன்",
    "விற்ற",
    "விற்பனை",

    # Tamil - real STT variations observed during testing
    "வித்தேன்",
    "விட்டேன்",
    "வித்தன்",
    "விட்டன்",

    # Sinhala
    "විකුණුවා",
    "විකුණන්න",
    "විකිණීම",
]


ADD_WORDS = [
    "add",
    "added",
    "received",
    "restock",
    "stock in",
    "bought",

    "சேர்க்க",
    "சேர்த்தேன்",
    "சேர்த்து",
    "வாங்கினேன்",

    "එකතු",
    "එකතු කරන්න",
    "ගත්තා",
]


QUERY_WORDS = [
    "how many",
    "left",
    "remaining",
    "available",
    "stock",

    "எத்தனை",
    "எவ்வளவு",
    "இருப்பு",
    "மீதம்",
    "உள்ளது",

    "කීයද",
    "කොච්චර",
    "තොග",
    "ඉතිරි",
    "තියෙනවා",
]


# ============================================================
# TEXT HELPERS
# ============================================================

def normalize(text: str) -> str:

    text = unicodedata.normalize(
        "NFKC",
        text or "",
    )

    text = text.lower().strip()

    text = re.sub(
        r"[^\w\s\u0B80-\u0BFF\u0D80-\u0DFF.-]",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text


def contains_any(
    text: str,
    words: list[str],
) -> bool:

    return any(
        normalize(word) in text
        for word in words
    )


# ============================================================
# INTENT
# ============================================================

def detect_intent(text: str):

    # Query first because a phrase may also contain "stock".
    if contains_any(
        text,
        QUERY_WORDS,
    ):
        return "query_stock", 0.95

    if contains_any(
        text,
        ADD_WORDS,
    ):
        return "add_stock", 0.95

    if contains_any(
        text,
        SALE_WORDS,
    ):
        return "sale", 0.95

    return "unknown", 0.20


# ============================================================
# QUANTITY
# ============================================================

def extract_quantity(
    text: str,
) -> Optional[int]:

    # First look for actual digits such as 3, 10, 25
    number = re.search(
        r"(?<!\w)(\d{1,4})(?!\w)",
        text,
    )

    if number:

        value = int(
            number.group(1)
        )

        if value > 0:
            return value

    # Exact word matching instead of substring matching
    tokens = text.split()

    for token in tokens:

        clean_token = token.strip(
            ".,!?;:-"
        )

        if clean_token in NUMBER_WORDS:

            return NUMBER_WORDS[
                clean_token
            ]

    return None


# ============================================================
# PRODUCT MATCHING
# ============================================================

def aliases_for_product(
    product: Product,
):

    aliases = [
        product.name
    ]

    name = normalize(
        product.name
    )

    for canonical, values in PRODUCT_ALIASES.items():

        if canonical in name or name in canonical:

            aliases.extend(
                values
            )

    return aliases


def find_product(
    text: str,
    products: list[Product],
):

    best_product = None
    best_score = 0.0

    for product in products:

        aliases = aliases_for_product(
            product
        )

        for alias in aliases:

            alias_text = normalize(
                alias
            )

            if alias_text in text:

                score = 100.0

            else:

                score = float(
                    fuzz.partial_ratio(
                        alias_text,
                        text,
                    )
                )

            if score > best_score:

                best_score = score
                best_product = product

    # Avoid unsafe low-confidence matches.
    if best_score < 62:

        return None, best_score

    return (
        best_product,
        best_score,
    )


# ============================================================
# COMMAND PARSING
# ============================================================

@router.post(
    "/parse-command"
)
def parse_command(
    request: CommandRequest,
    db: Session = Depends(get_db),
):

    raw_text = request.text

    text = normalize(
        raw_text
    )

    intent, intent_confidence = detect_intent(
        text
    )

    quantity = extract_quantity(
        text
    )

    products = (
        db.query(Product)
        .filter(
            Product.shop_id
            == request.shop_id
        )
        .all()
    )

    product, product_score = find_product(
        text,
        products,
    )

    if intent == "unknown":

        return {
            "intent": "unknown",
            "product_id": (
                product.id
                if product
                else None
            ),
            "product_name": (
                product.name
                if product
                else None
            ),
            "quantity": quantity,
            "current_stock": (
                product.quantity
                if product
                else None
            ),
            "confidence": 0.20,
            "needs_confirmation": False,
            "raw_text": raw_text,
            "message":
                "Could not determine the inventory action.",
        }

    if not product:

        return {
            "intent": intent,
            "product_id": None,
            "product_name": None,
            "quantity": quantity,
            "current_stock": None,
            "confidence":
                round(
                    intent_confidence * 0.5,
                    2,
                ),
            "needs_confirmation": False,
            "raw_text": raw_text,
            "message":
                "Action understood, but product could not be matched.",
        }

    if (
        intent in [
            "sale",
            "add_stock",
        ]
        and not quantity
    ):

        return {
            "intent": intent,
            "product_id":
                product.id,
            "product_name":
                product.name,
            "quantity": None,
            "current_stock":
                product.quantity,
            "confidence": 0.60,
            "needs_confirmation": False,
            "raw_text": raw_text,
            "message":
                "Product found but quantity was not understood.",
        }

    confidence = (
        intent_confidence
        + product_score / 100
    ) / 2

    if intent == "query_stock":

        message = (
            f"{product.name} has "
            f"{product.quantity} units in stock."
        )

        needs_confirmation = False

    elif intent == "sale":

        message = (
            f"Sell {quantity} "
            f"{product.name}. "
            "Please confirm."
        )

        needs_confirmation = True

    else:

        message = (
            f"Add {quantity} "
            f"{product.name}. "
            "Please confirm."
        )

        needs_confirmation = True

    return {
        "intent": intent,
        "product_id":
            product.id,
        "product_name":
            product.name,
        "quantity":
            quantity,
        "current_stock":
            product.quantity,
        "confidence":
            round(
                confidence,
                2,
            ),
        "needs_confirmation":
            needs_confirmation,
        "raw_text":
            raw_text,
        "message":
            message,
    }


# ============================================================
# SALES HISTORY
# ============================================================

def get_daily_sales(
    db: Session,
    product_id: int,
    shop_id: int,
):

    product = (
        db.query(Product)
        .filter(
            Product.id
            == product_id,
            Product.shop_id
            == shop_id,
        )
        .first()
    )

    if not product:

        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    sales = (
        db.query(Sale)
        .filter(
            Sale.product_id
            == product_id,
            Sale.shop_id
            == shop_id,
        )
        .order_by(
            Sale.created_at.asc()
        )
        .all()
    )

    totals = defaultdict(float)

    for sale in sales:

        if not sale.created_at:
            continue

        sale_date = (
            sale.created_at.date()
        )

        totals[sale_date] += (
            sale.quantity
        )

    if not totals:

        return (
            product,
            [],
            [],
        )

    end = date.today()

    start = max(
        min(totals),
        end - timedelta(days=89),
    )

    dates = []
    quantities = []

    current = start

    while current <= end:

        dates.append(
            current
        )

        quantities.append(
            float(
                totals.get(
                    current,
                    0,
                )
            )
        )

        current += timedelta(
            days=1
        )

    return (
        product,
        dates,
        quantities,
    )


# ============================================================
# FORECASTING
# ============================================================

def forecast_logic(
    db: Session,
    product_id: int,
    shop_id: int = 1,
    horizon_days: int = 7,
):

    (
        product,
        dates,
        sales,
    ) = get_daily_sales(
        db,
        product_id,
        shop_id,
    )

    future_dates = [
        date.today()
        + timedelta(days=i)

        for i in range(
            1,
            horizon_days + 1,
        )
    ]

    # ------------------------------------
    # Cold start
    # ------------------------------------

    if not sales:

        return {
            "product_id":
                product.id,

            "product_name":
                product.name,

            "method":
                "no_history",

            "history_days":
                0,

            "predicted_total":
                0,

            "predicted_daily": [
                {
                    "date":
                        d.isoformat(),

                    "predicted_quantity":
                        0,
                }

                for d in future_dates
            ],

            "validation_mae":
                None,

            "note":
                "No sales history available. Forecast is not invented.",
        }

    # ------------------------------------
    # Moving-average baseline
    # ------------------------------------

    if len(sales) < 14:

        window = sales[
            -min(
                len(sales),
                7,
            ):
        ]

        average = (
            sum(window)
            / len(window)
        )

        predictions = [
            max(
                0,
                average,
            )

            for _ in future_dates
        ]

        return {
            "product_id":
                product.id,

            "product_name":
                product.name,

            "method":
                "moving_average_7d",

            "history_days":
                len(sales),

            "predicted_total":
                round(
                    sum(predictions),
                    2,
                ),

            "predicted_daily": [
                {
                    "date":
                        d.isoformat(),

                    "predicted_quantity":
                        round(p, 2),
                }

                for d, p
                in zip(
                    future_dates,
                    predictions,
                )
            ],

            "validation_mae":
                None,

            "note":
                "Limited history. Moving-average baseline used instead of ML.",
        }

    # ------------------------------------
    # Random Forest
    # ------------------------------------

    from sklearn.ensemble import (
        RandomForestRegressor,
    )

    from sklearn.metrics import (
        mean_absolute_error,
    )

    X = []
    y = []

    for i in range(
        7,
        len(sales),
    ):

        rolling_7 = (
            sum(
                sales[i - 7:i]
            )
            / 7
        )

        features = [
            i,
            dates[i].weekday(),
            sales[i - 1],
            sales[i - 7],
            rolling_7,
        ]

        X.append(
            features
        )

        y.append(
            sales[i]
        )

    validation_mae = None

    if len(X) >= 10:

        test_size = min(
            7,
            max(
                2,
                len(X) // 5,
            ),
        )

        train_X = X[:-test_size]
        test_X = X[-test_size:]

        train_y = y[:-test_size]
        test_y = y[-test_size:]

        test_model = (
            RandomForestRegressor(
                n_estimators=100,
                max_depth=6,
                random_state=42,
            )
        )

        test_model.fit(
            train_X,
            train_y,
        )

        predictions = (
            test_model.predict(
                test_X
            )
        )

        validation_mae = float(
            mean_absolute_error(
                test_y,
                predictions,
            )
        )

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=6,
        random_state=42,
    )

    model.fit(
        X,
        y,
    )

    extended = list(
        sales
    )

    predicted = []

    for future_date in future_dates:

        i = len(
            extended
        )

        rolling_7 = (
            sum(
                extended[-7:]
            )
            / min(
                7,
                len(extended),
            )
        )

        lag_7 = (
            extended[-7]
            if len(extended) >= 7
            else rolling_7
        )

        features = [[
            i,
            future_date.weekday(),
            extended[-1],
            lag_7,
            rolling_7,
        ]]

        value = float(
            model.predict(
                features
            )[0]
        )

        value = max(
            0,
            value,
        )

        value = round(
            value,
            2,
        )

        predicted.append(
            value
        )

        extended.append(
            value
        )

    return {
        "product_id":
            product.id,

        "product_name":
            product.name,

        "method":
            "random_forest",

        "history_days":
            len(sales),

        "predicted_total":
            round(
                sum(predicted),
                2,
            ),

        "predicted_daily": [
            {
                "date":
                    d.isoformat(),

                "predicted_quantity":
                    value,
            }

            for d, value
            in zip(
                future_dates,
                predicted,
            )
        ],

        "validation_mae":
            (
                round(
                    validation_mae,
                    3,
                )
                if validation_mae
                is not None
                else None
            ),

        "note":
            (
                "Forecast uses weekday, lag-1, "
                "lag-7 and rolling-average features."
            ),
    }


@router.get(
    "/forecast/{product_id}"
)
def forecast_product(
    product_id: int,

    shop_id: int = Query(
        default=1,
        gt=0,
    ),

    horizon_days: int = Query(
        default=7,
        ge=1,
        le=30,
    ),

    db: Session = Depends(
        get_db
    ),
):

    return forecast_logic(
        db,
        product_id,
        shop_id,
        horizon_days,
    )


# ============================================================
# SHOPPING RECOMMENDATION
# ============================================================

@router.get(
    "/recommendations"
)
def recommendations(
    budget: float = Query(
        ...,
        ge=0,
    ),

    horizon_days: int = Query(
        7,
        ge=1,
        le=30,
    ),

    shop_id: int = Query(
        1,
        gt=0,
    ),

    db: Session = Depends(
        get_db
    ),
):

    products = (
        db.query(Product)
        .filter(
            Product.shop_id
            == shop_id
        )
        .all()
    )

    candidates = []

    for product in products:

        forecast = forecast_logic(
            db,
            product.id,
            shop_id,
            horizon_days,
        )

        forecast_demand = float(
            forecast[
                "predicted_total"
            ]
        )

        safety_stock = max(
            1,
            product.low_stock_threshold,
        )

        if (
            forecast["method"]
            == "no_history"
        ):

            target_stock = max(
                product.low_stock_threshold
                * 2,
                product.low_stock_threshold
                + 1,
            )

            reason = (
                "Cold-start low-stock rule"
            )

        else:

            target_stock = math.ceil(
                forecast_demand
                + safety_stock
            )

            reason = (
                f"{forecast['method']} "
                "+ safety stock"
            )

        required = max(
            0,
            target_stock
            - product.quantity,
        )

        if required <= 0:
            continue

        unit_cost = float(
            product.cost_price
            if product.cost_price
            is not None
            else product.selling_price
        )

        if unit_cost <= 0:
            continue

        urgency = (
            required
            / max(
                1,
                product.quantity + 1,
            )
        )

        candidates.append(
            {
                "product":
                    product,

                "forecast":
                    forecast_demand,

                "safety_stock":
                    safety_stock,

                "required":
                    required,

                "unit_cost":
                    unit_cost,

                "urgency":
                    urgency,

                "reason":
                    reason,
            }
        )

    candidates.sort(
        key=lambda x: (
            -x["urgency"],
            x["unit_cost"],
        )
    )

    remaining = float(
        budget
    )

    results = []

    for item in candidates:

        affordable = int(
            remaining
            // item["unit_cost"]
        )

        quantity = min(
            item["required"],
            affordable,
        )

        if quantity <= 0:
            continue

        cost = round(
            quantity
            * item["unit_cost"],
            2,
        )

        remaining -= cost

        product = item[
            "product"
        ]

        results.append(
            {
                "product_id":
                    product.id,

                "product_name":
                    product.name,

                "current_stock":
                    product.quantity,

                "forecast_demand":
                    round(
                        item["forecast"],
                        2,
                    ),

                "safety_stock":
                    item["safety_stock"],

                "required_quantity":
                    item["required"],

                "recommended_quantity":
                    quantity,

                "unit_cost":
                    round(
                        item["unit_cost"],
                        2,
                    ),

                "estimated_cost":
                    cost,

                "reason":
                    item["reason"],
            }
        )

    return {
        "budget":
            round(
                budget,
                2,
            ),

        "horizon_days":
            horizon_days,

        "estimated_spend":
            round(
                budget
                - remaining,
                2,
            ),

        "remaining_budget":
            round(
                remaining,
                2,
            ),

        "items":
            results,
    }


# ============================================================
# INVOICE OCR
# ============================================================

@router.post(
    "/invoice-ocr"
)
async def invoice_ocr(
    file: UploadFile = File(...),

    language: str = Query(
        "eng"
    ),
):

    try:

        from PIL import (
            Image,
            ImageEnhance,
            ImageOps,
        )

        import pytesseract

    except ImportError:

        raise HTTPException(
            status_code=500,
            detail=(
                "Install Pillow and pytesseract."
            ),
        )

    allowed_languages = {
        "eng",
        "tam",
        "sin",
        "eng+tam",
        "eng+sin",
        "eng+tam+sin",
    }

    if (
        language
        not in allowed_languages
    ):

        language = "eng"

    content = await file.read()

    try:

        image = (
            Image.open(
                BytesIO(content)
            )
            .convert("L")
        )

        image = (
            ImageOps.autocontrast(
                image
            )
        )

        image = (
            ImageEnhance
            .Contrast(image)
            .enhance(1.4)
        )

        text = (
            pytesseract
            .image_to_string(
                image,
                lang=language,
            )
        )

    except (
        pytesseract
        .TesseractNotFoundError
    ):

        raise HTTPException(
            status_code=503,
            detail=(
                "Tesseract OCR program "
                "is not installed."
            ),
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    lines = [
        line.strip()

        for line
        in text.splitlines()

        if line.strip()
    ]

    candidate_lines = [
        line

        for line
        in lines

        if re.search(
            r"\d",
            line,
        )
    ]

    return {
        "language":
            language,

        "raw_text":
            text.strip(),

        "lines":
            lines,

        "candidate_lines":
            candidate_lines,

        "note":
            (
                "OCR result must be manually "
                "confirmed before updating inventory."
            ),
    }