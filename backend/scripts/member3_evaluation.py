import argparse
import csv
import json
import re
import sys
import unicodedata

from collections import defaultdict
from datetime import date, timedelta
from difflib import SequenceMatcher
from pathlib import Path


BACKEND_ROOT = Path(
    __file__
).resolve().parents[1]

REPO_ROOT = BACKEND_ROOT.parent

sys.path.insert(
    0,
    str(BACKEND_ROOT),
)


EVIDENCE = (
    REPO_ROOT
    / "docs"
    / "evidence"
)

EVIDENCE.mkdir(
    parents=True,
    exist_ok=True,
)


API = "http://127.0.0.1:8000"


# =========================================================
# COMMON
# =========================================================

def norm(value):

    return unicodedata.normalize(
        "NFKC",
        str(value or ""),
    ).strip().lower()


def percentage(
    correct,
    total,
):

    if total == 0:
        return None

    return round(
        correct
        / total
        * 100,
        2,
    )


# =========================================================
# VOICE TEST TEMPLATE
# =========================================================

VOICE_CASES = [

    # English

    (
        "E01",
        "English",
        "Sold 3 biscuits",
        "sale",
        "Biscuits",
        "3",
    ),

    (
        "E02",
        "English",
        "Sell 2 soap",
        "sale",
        "Soap",
        "2",
    ),

    (
        "E03",
        "English",
        "Sold 5 rice",
        "sale",
        "Rice",
        "5",
    ),

    (
        "E04",
        "English",
        "Add 10 soap",
        "add_stock",
        "Soap",
        "10",
    ),

    (
        "E05",
        "English",
        "Add 4 biscuits",
        "add_stock",
        "Biscuits",
        "4",
    ),

    (
        "E06",
        "English",
        "Restock 6 rice",
        "add_stock",
        "Rice",
        "6",
    ),

    (
        "E07",
        "English",
        "How many milk powder packets are left?",
        "query_stock",
        "Milk Powder",
        "",
    ),

    (
        "E08",
        "English",
        "How many biscuits are left?",
        "query_stock",
        "Biscuits",
        "",
    ),

    (
        "E09",
        "English",
        "Stock of soap",
        "query_stock",
        "Soap",
        "",
    ),

    (
        "E10",
        "English",
        "How much stock of rice is available?",
        "query_stock",
        "Rice",
        "",
    ),


    # Tamil

    (
        "T01",
        "Tamil",
        "மூன்று பிஸ்கட் விற்றேன்",
        "sale",
        "Biscuits",
        "3",
    ),

    (
        "T02",
        "Tamil",
        "இரண்டு சோப்பு விற்றேன்",
        "sale",
        "Soap",
        "2",
    ),

    (
        "T03",
        "Tamil",
        "ஐந்து அரிசி விற்றேன்",
        "sale",
        "Rice",
        "5",
    ),

    (
        "T04",
        "Tamil",
        "பத்து சோப்பு சேர்க்க",
        "add_stock",
        "Soap",
        "10",
    ),

    (
        "T05",
        "Tamil",
        "நான்கு பிஸ்கட் சேர்க்க",
        "add_stock",
        "Biscuits",
        "4",
    ),

    (
        "T06",
        "Tamil",
        "ஆறு அரிசி சேர்க்க",
        "add_stock",
        "Rice",
        "6",
    ),

    (
        "T07",
        "Tamil",
        "பால் மா எத்தனை உள்ளது",
        "query_stock",
        "Milk Powder",
        "",
    ),

    (
        "T08",
        "Tamil",
        "பிஸ்கட் எத்தனை உள்ளது",
        "query_stock",
        "Biscuits",
        "",
    ),

    (
        "T09",
        "Tamil",
        "சோப்பு இருப்பு எவ்வளவு",
        "query_stock",
        "Soap",
        "",
    ),

    (
        "T10",
        "Tamil",
        "அரிசி எவ்வளவு மீதம்",
        "query_stock",
        "Rice",
        "",
    ),


    # Sinhala

    (
        "S01",
        "Sinhala",
        "බිස්කට් තුනක් විකුණුවා",
        "sale",
        "Biscuits",
        "3",
    ),

    (
        "S02",
        "Sinhala",
        "සබන් දෙකක් විකුණුවා",
        "sale",
        "Soap",
        "2",
    ),

    (
        "S03",
        "Sinhala",
        "හාල් පහක් විකුණුවා",
        "sale",
        "Rice",
        "5",
    ),

    (
        "S04",
        "Sinhala",
        "සබන් දහයක් එකතු කරන්න",
        "add_stock",
        "Soap",
        "10",
    ),

    (
        "S05",
        "Sinhala",
        "බිස්කට් හතරක් එකතු කරන්න",
        "add_stock",
        "Biscuits",
        "4",
    ),

    (
        "S06",
        "Sinhala",
        "හාල් හයක් එකතු කරන්න",
        "add_stock",
        "Rice",
        "6",
    ),

    (
        "S07",
        "Sinhala",
        "කිරි පිටි කීයද",
        "query_stock",
        "Milk Powder",
        "",
    ),

    (
        "S08",
        "Sinhala",
        "බිස්කට් කීයද",
        "query_stock",
        "Biscuits",
        "",
    ),

    (
        "S09",
        "Sinhala",
        "සබන් තොග කීයද",
        "query_stock",
        "Soap",
        "",
    ),

    (
        "S10",
        "Sinhala",
        "හාල් ඉතිරි කීයද",
        "query_stock",
        "Rice",
        "",
    ),

]


def create_voice_template():

    path = (
        EVIDENCE
        / "voice_test_cases.csv"
    )

    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.writer(
            file
        )

        writer.writerow([
            "case_id",
            "language",
            "spoken_command",
            "transcript",
            "expected_intent",
            "expected_product",
            "expected_quantity",
        ])

        for case in VOICE_CASES:

            writer.writerow([
                case[0],
                case[1],
                case[2],
                "",
                case[3],
                case[4],
                case[5],
            ])

    print(
        f"Created: {path}"
    )

    print(
        "Speak each command using the actual app."
    )

    print(
        "Paste the ACTUAL speech-recognition result into the transcript column."
    )


# =========================================================
# VOICE EVALUATION
# =========================================================

def evaluate_voice():

    import httpx

    input_path = (
        EVIDENCE
        / "voice_test_cases.csv"
    )

    if not input_path.exists():

        raise SystemExit(
            "Run: python scripts/member3_evaluation.py voice-template"
        )


    rows = list(
        csv.DictReader(
            input_path.open(
                "r",
                encoding="utf-8-sig",
            )
        )
    )


    results = []


    for row in rows:

        transcript = (
            row["transcript"]
            .strip()
        )

        if not transcript:

            continue


        response = httpx.post(
            f"{API}/api/ai/parse-command",

            json={
                "text":
                    transcript,

                "shop_id":
                    1,
            },

            timeout=15,
        )

        response.raise_for_status()

        data = (
            response.json()
        )


        expected_quantity = (
            int(
                row[
                    "expected_quantity"
                ]
            )

            if row[
                "expected_quantity"
            ].strip()

            else None
        )


        intent_ok = (
            data.get("intent")
            ==
            row["expected_intent"]
        )


        product_ok = (
            norm(
                data.get(
                    "product_name"
                )
            )
            ==
            norm(
                row[
                    "expected_product"
                ]
            )
        )


        if (
            row["expected_intent"]
            in (
                "sale",
                "add_stock",
            )
        ):

            quantity_ok = (
                data.get(
                    "quantity"
                )
                ==
                expected_quantity
            )

        else:

            quantity_ok = (
                data.get(
                    "quantity"
                )
                is None
            )


        end_to_end = (
            intent_ok
            and product_ok
            and quantity_ok
        )


        similarity = (
            SequenceMatcher(
                None,

                norm(
                    row[
                        "spoken_command"
                    ]
                ),

                norm(
                    transcript
                ),
            )
            .ratio()
        )


        results.append({

            **row,

            "actual_intent":
                data.get(
                    "intent"
                ),

            "actual_product":
                data.get(
                    "product_name"
                ),

            "actual_quantity":
                data.get(
                    "quantity"
                ),

            "confidence":
                data.get(
                    "confidence"
                ),

            "stt_similarity":
                round(
                    similarity,
                    4,
                ),

            "intent_pass":
                intent_ok,

            "product_pass":
                product_ok,

            "quantity_pass":
                quantity_ok,

            "end_to_end_pass":
                end_to_end,
        })


    output_path = (
        EVIDENCE
        / "voice_results.csv"
    )


    fields = [

        "case_id",
        "language",
        "spoken_command",
        "transcript",

        "expected_intent",
        "expected_product",
        "expected_quantity",

        "actual_intent",
        "actual_product",
        "actual_quantity",

        "confidence",
        "stt_similarity",

        "intent_pass",
        "product_pass",
        "quantity_pass",
        "end_to_end_pass",

    ]


    with output_path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields,
        )

        writer.writeheader()

        writer.writerows(
            results
        )


    total = len(
        results
    )


    summary = {

        "total_tested":
            total,

        "intent_accuracy_percent":
            percentage(
                sum(
                    bool(
                        row[
                            "intent_pass"
                        ]
                    )
                    for row
                    in results
                ),
                total,
            ),

        "product_accuracy_percent":
            percentage(
                sum(
                    bool(
                        row[
                            "product_pass"
                        ]
                    )
                    for row
                    in results
                ),
                total,
            ),

        "quantity_accuracy_percent":
            percentage(
                sum(
                    bool(
                        row[
                            "quantity_pass"
                        ]
                    )
                    for row
                    in results
                ),
                total,
            ),

        "end_to_end_parser_accuracy_percent":
            percentage(
                sum(
                    bool(
                        row[
                            "end_to_end_pass"
                        ]
                    )
                    for row
                    in results
                ),
                total,
            ),

    }


    summary_path = (
        EVIDENCE
        / "voice_summary.json"
    )


    summary_path.write_text(
        json.dumps(
            summary,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


    print(
        json.dumps(
            summary,
            indent=2,
        )
    )


# =========================================================
# FORECAST EVALUATION
# =========================================================

def evaluate_forecast():

    from sklearn.ensemble import (
        RandomForestRegressor
    )

    from sklearn.metrics import (
        mean_absolute_error
    )

    from app.database import (
        SessionLocal
    )

    from app.models.product import (
        Product
    )

    from app.models.sale import (
        Sale
    )


    database = SessionLocal()


    try:

        products = (
            database
            .query(Product)
            .filter(
                Product.shop_id
                == 1
            )
            .all()
        )


        output = []


        for product in products:

            sales = (
                database
                .query(Sale)
                .filter(
                    Sale.shop_id
                    == 1,

                    Sale.product_id
                    == product.id,
                )
                .order_by(
                    Sale.created_at.asc()
                )
                .all()
            )


            totals = defaultdict(
                float
            )


            for sale in sales:

                if sale.created_at:

                    totals[
                        sale.created_at.date()
                    ] += float(
                        sale.quantity
                    )


            if not totals:

                output.append({
                    "product":
                        product.name,

                    "history_days":
                        0,

                    "status":
                        "INSUFFICIENT_HISTORY",

                    "moving_average_mae":
                        "",

                    "random_forest_mae":
                        "",
                })

                continue


            end = date.today()

            start = max(
                min(
                    totals.keys()
                ),

                end
                - timedelta(
                    days=89
                ),
            )


            dates = []

            values = []

            cursor = start


            while cursor <= end:

                dates.append(
                    cursor
                )

                values.append(
                    float(
                        totals.get(
                            cursor,
                            0,
                        )
                    )
                )

                cursor += timedelta(
                    days=1
                )


            if len(values) < 21:

                output.append({

                    "product":
                        product.name,

                    "history_days":
                        len(values),

                    "status":
                        "INSUFFICIENT_HISTORY",

                    "moving_average_mae":
                        "",

                    "random_forest_mae":
                        "",

                })

                continue


            holdout = 7

            split = (
                len(values)
                - holdout
            )


            actual = (
                values[
                    split:
                ]
            )


            # 7-day moving-average baseline

            moving_predictions = []


            for index in range(
                split,
                len(values),
            ):

                prediction = (
                    sum(
                        values[
                            index - 7:
                            index
                        ]
                    )
                    / 7
                )

                moving_predictions.append(
                    prediction
                )


            moving_mae = float(
                mean_absolute_error(
                    actual,
                    moving_predictions,
                )
            )


            # Random Forest

            training_x = []

            training_y = []


            for index in range(
                7,
                split,
            ):

                rolling = (
                    sum(
                        values[
                            index - 7:
                            index
                        ]
                    )
                    / 7
                )


                training_x.append([

                    index,

                    dates[
                        index
                    ].weekday(),

                    values[
                        index - 1
                    ],

                    values[
                        index - 7
                    ],

                    rolling,

                ])


                training_y.append(
                    values[
                        index
                    ]
                )


            if len(
                training_x
            ) < 7:

                output.append({

                    "product":
                        product.name,

                    "history_days":
                        len(values),

                    "status":
                        "BASELINE_ONLY",

                    "moving_average_mae":
                        round(
                            moving_mae,
                            4,
                        ),

                    "random_forest_mae":
                        "",

                })

                continue


            model = (
                RandomForestRegressor(
                    n_estimators=150,
                    max_depth=6,
                    random_state=42,
                )
            )


            model.fit(
                training_x,
                training_y,
            )


            forest_predictions = []


            for index in range(
                split,
                len(values),
            ):

                rolling = (
                    sum(
                        values[
                            index - 7:
                            index
                        ]
                    )
                    / 7
                )


                features = [[

                    index,

                    dates[
                        index
                    ].weekday(),

                    values[
                        index - 1
                    ],

                    values[
                        index - 7
                    ],

                    rolling,

                ]]


                prediction = float(
                    model.predict(
                        features
                    )[0]
                )


                forest_predictions.append(
                    max(
                        0,
                        prediction,
                    )
                )


            forest_mae = float(
                mean_absolute_error(
                    actual,
                    forest_predictions,
                )
            )


            output.append({

                "product":
                    product.name,

                "history_days":
                    len(values),

                "status":
                    "EVALUATED",

                "moving_average_mae":
                    round(
                        moving_mae,
                        4,
                    ),

                "random_forest_mae":
                    round(
                        forest_mae,
                        4,
                    ),

                "better_model":
                    (
                        "random_forest"

                        if forest_mae
                        < moving_mae

                        else
                        "moving_average"
                    ),

            })


    finally:

        database.close()


    path = (
        EVIDENCE
        / "forecast_results.csv"
    )


    fields = [

        "product",
        "history_days",
        "status",
        "moving_average_mae",
        "random_forest_mae",
        "better_model",

    ]


    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields,
            extrasaction="ignore",
        )

        writer.writeheader()

        writer.writerows(
            output
        )


    evaluated = [

        item

        for item
        in output

        if item["status"]
        == "EVALUATED"

    ]


    summary = {

        "products_total":
            len(output),

        "products_evaluated":
            len(evaluated),

        "mean_moving_average_mae":
            (
                round(
                    sum(
                        item[
                            "moving_average_mae"
                        ]
                        for item
                        in evaluated
                    )
                    / len(
                        evaluated
                    ),
                    4,
                )

                if evaluated
                else None
            ),

        "mean_random_forest_mae":
            (
                round(
                    sum(
                        item[
                            "random_forest_mae"
                        ]
                        for item
                        in evaluated
                    )
                    / len(
                        evaluated
                    ),
                    4,
                )

                if evaluated
                else None
            ),

        "note":
            (
                "If no product has sufficient real history, "
                "report insufficient history instead of inventing accuracy."
            ),

    }


    (
        EVIDENCE
        / "forecast_summary.json"
    ).write_text(

        json.dumps(
            summary,
            indent=2,
        ),

        encoding="utf-8",
    )


    print(
        json.dumps(
            summary,
            indent=2,
        )
    )


# =========================================================
# RECOMMENDATION EVALUATION
# =========================================================

def evaluate_recommendations():

    import httpx


    budgets = [
        5000,
        10000,
        20000,
    ]


    results = []


    for budget in budgets:

        response = httpx.get(

            f"{API}/api/ai/recommendations",

            params={
                "budget":
                    budget,

                "shop_id":
                    1,

                "horizon_days":
                    7,
            },

            timeout=30,
        )


        response.raise_for_status()

        data = response.json()


        estimated = float(
            data[
                "estimated_spend"
            ]
        )


        remaining = float(
            data[
                "remaining_budget"
            ]
        )


        items = data.get(
            "items",
            [],
        )


        result = {

            "budget":
                budget,

            "estimated_spend":
                estimated,

            "remaining_budget":
                remaining,

            "items":
                len(items),

            "budget_pass":
                estimated
                <= budget + 0.01,

            "remaining_pass":
                abs(
                    (
                        budget
                        - estimated
                    )
                    - remaining
                )
                <= 0.02,

            "quantity_pass":
                all(
                    item[
                        "recommended_quantity"
                    ] > 0

                    for item
                    in items
                ),

        }


        result[
            "all_pass"
        ] = (

            result[
                "budget_pass"
            ]

            and result[
                "remaining_pass"
            ]

            and result[
                "quantity_pass"
            ]

        )


        results.append(
            result
        )


    path = (
        EVIDENCE
        / "recommendation_results.csv"
    )


    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=list(
                results[0].keys()
            ),
        )

        writer.writeheader()

        writer.writerows(
            results
        )


    summary = {

        "tests_total":
            len(results),

        "tests_passed":
            sum(
                bool(
                    result[
                        "all_pass"
                    ]
                )
                for result
                in results
            ),

        "all_budget_safety_checks_pass":
            all(
                result[
                    "all_pass"
                ]
                for result
                in results
            ),

    }


    (
        EVIDENCE
        / "recommendation_summary.json"
    ).write_text(

        json.dumps(
            summary,
            indent=2,
        ),

        encoding="utf-8",
    )


    print(
        json.dumps(
            summary,
            indent=2,
        )
    )


# =========================================================
# OCR
# =========================================================

def create_ocr_template():

    invoice_folder = (
        EVIDENCE
        / "invoices"
    )

    invoice_folder.mkdir(
        parents=True,
        exist_ok=True,
    )


    path = (
        EVIDENCE
        / "ocr_manifest.csv"
    )


    if not path.exists():

        path.write_text(

            "case_id,image_path,language,ground_truth_path\n"
            "OCR01,docs/evidence/invoices/invoice01.jpg,eng,docs/evidence/invoices/invoice01.txt\n"
            "OCR02,docs/evidence/invoices/invoice02.jpg,eng,docs/evidence/invoices/invoice02.txt\n"
            "OCR03,docs/evidence/invoices/invoice03.jpg,eng,docs/evidence/invoices/invoice03.txt\n",

            encoding="utf-8",
        )


    print(
        f"Created {path}"
    )


def tokenize(
    text,
):

    return re.findall(

        r"\w+",

        unicodedata.normalize(
            "NFKC",
            text or "",
        ).lower(),

        flags=re.UNICODE,
    )


def evaluate_ocr():

    import httpx


    manifest = (
        EVIDENCE
        / "ocr_manifest.csv"
    )


    rows = list(
        csv.DictReader(
            manifest.open(
                "r",
                encoding="utf-8-sig",
            )
        )
    )


    results = []


    for row in rows:

        image_path = (
            REPO_ROOT
            / row[
                "image_path"
            ]
        )


        ground_truth = (
            REPO_ROOT
            / row[
                "ground_truth_path"
            ]
        )


        if (
            not image_path.exists()
            or not ground_truth.exists()
        ):

            print(
                "Skipping",
                row["case_id"],
                "- missing files",
            )

            continue


        expected = (
            ground_truth
            .read_text(
                encoding="utf-8"
            )
        )


        suffix = (
            image_path
            .suffix
            .lower()
        )


        mime = (
            "image/png"

            if suffix == ".png"

            else "image/jpeg"
        )


        with image_path.open(
            "rb"
        ) as image:

            response = httpx.post(

                f"{API}/api/ai/invoice-ocr",

                params={
                    "language":
                        row["language"]
                },

                files={
                    "file": (
                        image_path.name,
                        image,
                        mime,
                    )
                },

                timeout=60,
            )


        response.raise_for_status()

        actual = (
            response.json()
            .get(
                "raw_text",
                "",
            )
        )


        expected_tokens = (
            tokenize(
                expected
            )
        )

        actual_tokens = (
            tokenize(
                actual
            )
        )


        expected_counts = defaultdict(
            int
        )

        actual_counts = defaultdict(
            int
        )


        for token in expected_tokens:

            expected_counts[
                token
            ] += 1


        for token in actual_tokens:

            actual_counts[
                token
            ] += 1


        overlap = sum(

            min(
                expected_counts[
                    token
                ],

                actual_counts[
                    token
                ],
            )

            for token
            in set(
                expected_counts
            )
            |
            set(
                actual_counts
            )

        )


        precision = (
            overlap
            / len(
                actual_tokens
            )

            if actual_tokens
            else 0
        )


        recall = (
            overlap
            / len(
                expected_tokens
            )

            if expected_tokens
            else 0
        )


        f1 = (
            2
            * precision
            * recall
            / (
                precision
                + recall
            )

            if precision
            + recall

            else 0
        )


        results.append({

            "case_id":
                row["case_id"],

            "language":
                row["language"],

            "precision_percent":
                round(
                    precision * 100,
                    2,
                ),

            "recall_percent":
                round(
                    recall * 100,
                    2,
                ),

            "f1_percent":
                round(
                    f1 * 100,
                    2,
                ),

        })


    path = (
        EVIDENCE
        / "ocr_results.csv"
    )


    if results:

        with path.open(
            "w",
            encoding="utf-8-sig",
            newline="",
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=list(
                    results[0].keys()
                ),
            )

            writer.writeheader()

            writer.writerows(
                results
            )


    summary = {

        "invoices_tested":
            len(results),

        "mean_token_f1_percent":
            (
                round(
                    sum(
                        row[
                            "f1_percent"
                        ]
                        for row
                        in results
                    )
                    / len(
                        results
                    ),
                    2,
                )

                if results
                else None
            ),

    }


    (
        EVIDENCE
        / "ocr_summary.json"
    ).write_text(

        json.dumps(
            summary,
            indent=2,
        ),

        encoding="utf-8",
    )


    print(
        json.dumps(
            summary,
            indent=2,
        )
    )


# =========================================================
# AI USAGE REPORT
# =========================================================

def read_summary(
    filename,
):

    path = (
        EVIDENCE
        / filename
    )

    if not path.exists():
        return {}

    return json.loads(
        path.read_text(
            encoding="utf-8"
        )
    )


def format_percent(
    value,
):

    if value is None:

        return (
            "Not available / "
            "insufficient evidence"
        )

    return f"{value}%"


def build_report():

    voice = read_summary(
        "voice_summary.json"
    )

    forecast = read_summary(
        "forecast_summary.json"
    )

    recommendations = (
        read_summary(
            "recommendation_summary.json"
        )
    )

    ocr = read_summary(
        "ocr_summary.json"
    )


    report = f"""# KadaiAI – AI Usage Report

## 1. Overview

KadaiAI uses AI-assisted and intelligent components to reduce typing and support inventory decisions for small Sri Lankan retailers.

Member 3 implemented multilingual voice interaction, command interpretation, demand forecasting, budget-aware restocking recommendations, and supplier invoice OCR.

## 2. AI / Intelligent Components

### Speech-to-Text

The Expo application uses platform speech recognition through `expo-speech-recognition` for English, Tamil, and Sinhala.

### Inventory Command Interpretation

The backend parser is not a generative LLM. It combines multilingual intent keywords, number extraction, product aliases, RapidFuzz product matching, confidence scoring, and confirmation rules.

Supported intents:

- `sale`
- `add_stock`
- `query_stock`

### Text-to-Speech

`expo-speech` provides spoken feedback where a suitable voice is supported by the device/platform.

### Demand Forecasting

KadaiAI uses a staged approach:

- no history: no invented forecast
- limited history: 7-day moving-average baseline
- sufficient history: Random Forest regression using time, weekday, lag-1, lag-7 and rolling-7 features

### Smart Restocking

Restocking recommendations combine predicted demand, current inventory, safety stock, unit cost, and the user's purchasing budget.

### OCR

Supplier invoice images are preprocessed with Pillow and processed using Tesseract OCR. OCR results require manual review.

## 3. Evaluation

### Voice / Command Understanding

Completed voice test cases: **{voice.get("total_tested", 0)}**

- Intent accuracy: **{format_percent(voice.get("intent_accuracy_percent"))}**
- Product identification accuracy: **{format_percent(voice.get("product_accuracy_percent"))}**
- Quantity extraction accuracy: **{format_percent(voice.get("quantity_accuracy_percent"))}**
- End-to-end parser accuracy: **{format_percent(voice.get("end_to_end_parser_accuracy_percent"))}**

### Forecasting

Products with sufficient history: **{forecast.get("products_evaluated", 0)}**

Moving-average MAE:

**{forecast.get("mean_moving_average_mae", "Not available / insufficient history")}**

Random Forest MAE:

**{forecast.get("mean_random_forest_mae", "Not available / insufficient history")}**

If sufficient real historical data is unavailable, KadaiAI reports this limitation rather than presenting fabricated forecasting accuracy.

### Restocking Recommendation

Budget/consistency tests passed:

**{recommendations.get("tests_passed", 0)} / {recommendations.get("tests_total", 0)}**

### Invoice OCR

Invoices evaluated:

**{ocr.get("invoices_tested", 0)}**

Mean token-level F1:

**{format_percent(ocr.get("mean_token_f1_percent"))}**

## 4. Human-in-the-Loop Control

Inventory-changing voice actions follow:

Speech → Speech-to-Text → command parsing → product/quantity detection → user confirmation → existing backend API → database update.

Stock queries do not change inventory and therefore do not require confirmation.

OCR results are also presented for manual review instead of automatically modifying inventory.

## 5. Limitations

- Speech recognition depends on microphone quality, environmental noise, accent, browser/device recognition services, and Tamil/Sinhala support.
- Keyword and fuzzy command parsing can fail on unseen wording or unusual speech-recognition output.
- Forecasting quality depends on sufficient representative sales history.
- New products have a cold-start problem.
- OCR quality depends on image resolution, lighting, blur, skew, invoice layout, fonts and installed language packs.
- Restocking recommendations are decision-support outputs and do not model every supplier, shelf-life, promotion or cash-flow constraint.

## 6. Evidence

Evaluation outputs are stored under:

`docs/evidence/`

Only measured results from completed tests should be reported.
"""


    path = (
        REPO_ROOT
        / "docs"
        / "AI_USAGE_REPORT.md"
    )


    path.write_text(
        report,
        encoding="utf-8",
    )


    print(
        f"Generated: {path}"
    )


# =========================================================
# CLI
# =========================================================

def main():

    parser = (
        argparse.ArgumentParser()
    )


    parser.add_argument(
        "action",

        choices=[

            "voice-template",
            "voice",
            "forecast",
            "recommendations",
            "ocr-template",
            "ocr",
            "report",

        ],
    )


    args = parser.parse_args()


    if (
        args.action
        == "voice-template"
    ):

        create_voice_template()


    elif (
        args.action
        == "voice"
    ):

        evaluate_voice()


    elif (
        args.action
        == "forecast"
    ):

        evaluate_forecast()


    elif (
        args.action
        == "recommendations"
    ):

        evaluate_recommendations()


    elif (
        args.action
        == "ocr-template"
    ):

        create_ocr_template()


    elif (
        args.action
        == "ocr"
    ):

        evaluate_ocr()


    elif (
        args.action
        == "report"
    ):

        build_report()


if __name__ == "__main__":
    main()