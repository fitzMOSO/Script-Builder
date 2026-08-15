"""Additional sample script sets.

These are *invented demo content* — no real campaign, client or product is
represented here. They exist so the Script Library,
the header switcher and the Run screen have more than one script to work with,
and so the merge-variable substitution is visible with values already filled in.

Same tuple shapes as seed.py:
  step      = (statement_no, title, category, required, allow_skip, content)
  objection = (severity, title, [prospect phrasings], [agent rebuttals])
"""

SAMPLE_SETS: list[dict] = [
    {
        "set": {
            "name": "Card Billing Dispute - Inbound Service",
            "description": "Inbound customer service flow for a cardholder disputing a charge on their statement. Sample content.",
            "status": "published",
            "version": 1,
            "variable_values": {
                "agent_name": "Ella",
                "bank_name": "Northwind Bank",
                "cardholder_first_name": "Ma'am/Sir",
                "dispute_window_days": "60",
                "provisional_credit_days": "10",
                "investigation_days": "45",
                "hotline_number": "(02) 8888-1888",
                "reference_prefix": "DSP",
            },
        },
        "steps": [
            (
                1,
                "Greeting",
                "Opening",
                True,
                False,
                "Thank you for calling {{bank_name}}, this is {{agent_name}}. "
                "How may I help you today?",
            ),
            (
                2,
                "Verify the cardholder",
                "Introduction",
                True,
                False,
                "Before we discuss the account, may I verify a few details? "
                "Could you confirm the last four digits of your card, your date of birth, "
                "and your registered mobile number?",
            ),
            (
                3,
                "Confirm the disputed transaction",
                "Probing",
                True,
                False,
                "Thank you, {{cardholder_first_name}}. Let's look at the charge together. "
                "Can you confirm the merchant name, the amount, and the date it posted?",
            ),
            (
                4,
                "Establish the dispute reason",
                "Probing",
                True,
                False,
                "So I file this correctly, which of these best describes it: you did not "
                "authorise the transaction, you were billed twice, you were charged the "
                "wrong amount, or you paid but the merchant still charged the card?",
            ),
            (
                5,
                "Set expectations",
                "Presentation",
                True,
                False,
                "Here is what happens next. Disputes must be filed within "
                "{{dispute_window_days}} days of the statement date, and yours is within "
                "that window. We will apply a provisional credit within "
                "{{provisional_credit_days}} banking days while the investigation runs, "
                "which takes up to {{investigation_days}} days.",
            ),
            (
                6,
                "Supporting documents",
                "Enrollment",
                False,
                True,
                "If you have a receipt, a cancellation email, or any message from the "
                "merchant, sending it in speeds this up considerably. I can email you the "
                "upload link now — would you like that?",
            ),
            (
                7,
                "Reference and close",
                "Close",
                True,
                False,
                "Your dispute reference is {{reference_prefix}} followed by the number I am "
                "sending by SMS now. You can check the status any time on "
                "{{hotline_number}}. Is there anything else I can help you with today?",
            ),
        ],
        "objections": [
            (
                "MAJOR",
                "Wants the money back immediately",
                [
                    "I need my money back today.",
                    "Why do I have to wait 45 days for my own money?",
                ],
                [
                    "I understand completely — that charge is your money and you want it back. "
                    "The provisional credit lands within {{provisional_credit_days}} banking "
                    "days, so you are not waiting the full investigation to get use of it.",
                    "The {{investigation_days}} days is the outside limit, not the target. Most "
                    "disputes with supporting documents close well before that.",
                ],
            ),
            (
                "MAJOR",
                "Suspects fraud on the card",
                [
                    "I never made that transaction.",
                    "Someone must have my card details.",
                ],
                [
                    "Thank you for telling me — I will block the card now so nothing further "
                    "can be charged, and arrange a replacement to your registered address.",
                    "Let's also review the last 30 days together so we catch anything else "
                    "you don't recognise while I have you on the line.",
                ],
            ),
            (
                "MINOR",
                "Does not want to file formally",
                [
                    "Can't you just remove the charge?",
                    "I don't want to fill out any forms.",
                ],
                [
                    "There is no form for you to fill in — I raise the dispute here on the call "
                    "and you simply confirm the details I read back.",
                    "Filing it formally is what protects you: it puts the charge on hold and "
                    "obliges the merchant to respond.",
                ],
            ),
        ],
    },
    {
        "set": {
            "name": "Balance Transfer Offer - Outbound",
            "description": "Outbound offer inviting existing cardholders to move a competitor card balance at a promotional rate. Sample content.",
            "status": "published",
            "version": 1,
            "variable_values": {
                "agent_name": "Miguel",
                "bank_name": "Northwind Bank",
                "cardholder_full_name": "Mr./Ms. Dela Cruz",
                "cardholder_last_name": "Dela Cruz",
                "promo_rate": "0.88%",
                "standard_rate": "3%",
                "term_months": "12",
                "min_transfer": "10,000",
                "max_transfer": "300,000",
                "processing_fee": "waived",
                "posting_days": "5",
                "hotline_number": "(02) 8888-1888",
            },
        },
        "steps": [
            (
                1,
                "Opening",
                "Opening",
                True,
                False,
                "Good day, may I speak with {{cardholder_full_name}}?",
            ),
            (
                2,
                "Introduce yourself",
                "Introduction",
                True,
                False,
                "Hello {{cardholder_last_name}}, this is {{agent_name}} calling on behalf of "
                "{{bank_name}}. This call may be recorded for quality purposes. "
                "Do you have two minutes?",
            ),
            (
                3,
                "State the purpose",
                "Purpose",
                True,
                False,
                "I'm calling because your account qualifies for our Balance Transfer "
                "programme — it lets you move a balance from another bank's card onto your "
                "{{bank_name}} card at a much lower rate.",
            ),
            (
                4,
                "Qualify the need",
                "Probing",
                True,
                True,
                "May I ask — do you currently carry a balance on a card from another bank? "
                "And roughly what interest are you paying on it each month?",
            ),
            (
                5,
                "Present the offer",
                "Offer",
                True,
                False,
                "Here is the offer: {{promo_rate}} monthly interest for {{term_months}} "
                "months, versus the standard {{standard_rate}}. You can transfer from "
                "{{min_transfer}} up to {{max_transfer}} pesos, and the processing fee is "
                "{{processing_fee}}.",
            ),
            (
                6,
                "Enrol",
                "Enrollment",
                True,
                False,
                "To proceed I need the issuing bank, the card's last four digits, and the "
                "amount you'd like to transfer. The funds post to the other bank within "
                "{{posting_days}} banking days.",
            ),
            (
                7,
                "Confirm and close",
                "Close",
                True,
                False,
                "To confirm: {{promo_rate}} for {{term_months}} months, fee "
                "{{processing_fee}}, posting in {{posting_days}} banking days. You'll get an "
                "SMS confirmation shortly. For anything else, call {{hotline_number}}. "
                "Thank you for your time, {{cardholder_last_name}}.",
            ),
        ],
        "objections": [
            (
                "MAJOR",
                "Not interested / no time",
                [
                    "I'm busy right now.",
                    "I'm not interested, thank you.",
                ],
                [
                    "I completely understand — this takes ninety seconds and could cut what "
                    "you pay in interest by more than half. May I give you just the numbers?",
                    "No problem at all. May I send the details by SMS so you can look at them "
                    "when it suits you?",
                ],
            ),
            (
                "MAJOR",
                "Doubts the rate is real",
                [
                    "There must be hidden charges.",
                    "That rate sounds too good to be true.",
                ],
                [
                    "It's a fair question. The rate is {{promo_rate}} monthly for the full "
                    "{{term_months}} months, the processing fee is {{processing_fee}}, and "
                    "there is no pre-termination penalty. Everything is in the confirmation "
                    "we send you.",
                    "After {{term_months}} months any remaining balance simply reverts to the "
                    "standard {{standard_rate}} — nothing is backdated.",
                ],
            ),
            (
                "MINOR",
                "Wants to think about it",
                [
                    "Let me discuss it with my spouse.",
                    "Can I call you back?",
                ],
                [
                    "Of course. I'll send the terms by SMS now so you both have the numbers in "
                    "front of you. When would be a good time for me to follow up?",
                    "The promotional rate is limited, so if it helps I can reserve your slot "
                    "today and you can cancel any time before the funds post.",
                ],
            ),
        ],
    },
    {
        "set": {
            "name": "Early Past-Due Reminder - Collections",
            "description": "Courtesy reminder for an account 1-30 days past due, before formal collections. Draft — pending compliance review. Sample content.",
            "status": "draft",
            "version": 1,
            "variable_values": {
                "agent_name": "Joanna",
                "bank_name": "Northwind Bank",
                "cardholder_last_name": "Dela Cruz",
                "amount_due": "8,450",
                "due_date": "the 15th",
                "days_past_due": "12",
                "late_fee": "600",
                "min_payment": "1,200",
                "hotline_number": "(02) 8888-1888",
            },
        },
        "steps": [
            (
                1,
                "Opening",
                "Opening",
                True,
                False,
                "Good day, am I speaking with {{cardholder_last_name}}?",
            ),
            (
                2,
                "Identify and disclose",
                "Introduction",
                True,
                False,
                "This is {{agent_name}} from {{bank_name}}. This is an attempt to collect a "
                "debt and any information obtained will be used for that purpose. "
                "This call is recorded.",
            ),
            (
                3,
                "State the account status",
                "Purpose",
                True,
                False,
                "I'm calling as a courtesy — your account shows {{amount_due}} pesos "
                "outstanding, due on {{due_date}}, now {{days_past_due}} days past due.",
            ),
            (
                4,
                "Understand the situation",
                "Probing",
                True,
                False,
                "Is there a reason the payment hasn't gone through? I'd like to find an "
                "arrangement that works before any further charges apply.",
            ),
            (
                5,
                "Present the options",
                "Offer",
                True,
                False,
                "You have two options today. Settle the full {{amount_due}} and we waive "
                "nothing further, or pay the minimum of {{min_payment}} to keep the account "
                "current and avoid the {{late_fee}} peso late fee next cycle.",
            ),
            (
                6,
                "Confirm the commitment",
                "Close",
                True,
                False,
                "So I can note it on the account — how much will you be paying, and on what "
                "date? You can pay through the app, any branch, or over the phone on "
                "{{hotline_number}}. Thank you, {{cardholder_last_name}}.",
            ),
        ],
        "objections": [
            (
                "MAJOR",
                "Cannot pay right now",
                [
                    "I don't have the money.",
                    "I lost my job, I can't pay this month.",
                ],
                [
                    "Thank you for being straight with me. Rather than let it age further, can "
                    "you manage the minimum of {{min_payment}} this week? That alone keeps the "
                    "account current.",
                    "If not, I can refer you for a restructuring review — that spreads the "
                    "{{amount_due}} over fixed monthly instalments. Shall I start that?",
                ],
            ),
            (
                "MINOR",
                "Says the payment was already made",
                [
                    "I already paid that last week.",
                    "It should have cleared by now.",
                ],
                [
                    "Thank you — payments can take up to three banking days to reflect. Do you "
                    "have the reference number and the date? I'll trace it while we're on the "
                    "call.",
                    "If it has genuinely posted, I'll note the account so no further reminders "
                    "go out and any late fee is reversed.",
                ],
            ),
        ],
    },
]
