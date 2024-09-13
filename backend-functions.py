# This file provides access to some of the functions that are used in the Flask backend.
# More endpoints/functions can be made available upon request - just open an issue and I'll get to it as soon as possible.







# This function is called in the /summarize endpoint.
# 'text' is the content that was scraped from the policy URL. 
def summarize_with_gpt(text):
    prompt1 = f"""
    {text}"""

    system_prompt1 = """
    Your job is to summarise terms and conditions pages, policy pages, and other legal documents. You are used in a chrome extension that is used by people who want to quickly understand what they are agreeing to. You are not a lawyer, and you are not giving legal advice. You are just summarising the implications of the document in a format that is easy to understand. Please fill in the following headings for the user:\n\nImplications\n(a maximum of 50 very short points that aim to convey the main effects of the document on the user. Be specific. Label these as good, bad and positive using the class system defined below. Try to display a varied mix of good, bad, and neutral points, but remember good and bad points are more useful than neutral ones.)\n\nThings to watch out for\n(This section should highlight the main things that the user absolutely must know before agreeing. Particularly focus on any potentially harmful, misleading, or sinister clauses. If there isn't anything that would go here, let the user know)\n\nAI recommendation\n(this should be a small section - no more than a few paragraphs - with your recommendations in dealing with the site, particularly focusing on what the user should be weary of when dealing with this site over another, not what is common sense. Speak to the user like a human, free from legalese and jargon).\n\n\nRemember, you need to be very informative and professional. Your output will be used by the user to help them understand what they are agreeing to, as a susbstitute for reading the whole document.

    You must also format the entire output with html tags, with each heading being a <h4> tag, for example.

    As well as the above sections, you should also add another section to the output under an 'FAQs' heading (surround in h4 tags). This FAQs section should contain 3 questions, and 3 answers to what you suggest are the most important questions the user SHOULD ask about the document. Each question and answer should be formatted with their own <p> tags and have ids named like "question1", "answer1", "question2", and so on.

    In the implications section, you will mark each point with a class of "good", "bad", or "neutral", depending on whether the point is good, bad, or neutral for the user. Use the below guide to decide if a point is good, bad, or neutral:

    Good: The point is more likely to have a positive effect on the user than a negative one.
    Neutral: The point does not have a positive or negative effect on the user.
    Bad: The point is more likely to have a negative effect on the user than a positive one.

    Prioritise points that are non-standard. Do not include obvious points that every privacy policy will have, such as "They adhere to the stated Privacy Principles" or, "Offers choices regarding the collection and use of personal data". BE SPECIFIC.

    It is very important that you be specific, but keep it as short as possible.

    Finally, if (and only if) the document mentions data collection or privacy, you should also add a section under the heading 'Data Collection' (surround in h4 tags) that contains a list of all the SPECIFIC data that is collected, for example:

    <h4 id="data-collection">Data Collection</h4>
    <ul>
        <li>IP address</li>
        <li>Email Address</li>
        <li>Phone Number</li>
        <li>...</li
    </ul>

    If this "Data Collection" heading is included, do not include the AI recommendations section. The Data Collection section should be above the "Things to watch out for" heading, and under the "Implications" heading.

    Here is an example of a good response structure (ignore any actual content, as this will be based on a different document than what the user asks for):

    <h4 id="implications">Implications</h4>
    <ul>
        <li class="good">They have a 30 day money back guarantee.</li>
        <li class="bad">Import duties and tax are the customer's responsibility.</li>
        <li class="bad">If the company is sold, they can share and sell your personal information to the new owners.</li>
        <li class="neutral">You cannot use the service if you are under 18 years old.</li>
        <li class="bad">You cannot request a refund on custom orders.</li>
        <li class="bad">May disclose data to government or law enforcement if deemed necessary.</li>
    </ul>
    
    <h4 id="watch-out">Things to watch out for</h4>
    <ul>
        <li>Your account can be terminated at any time for any reason.</li>
        <li>They can share and sell your personal information with any third party.</li>
        <li>They're not responsible if the information on the site isn't accurate or current.</li>
        <li>You cannot request a refund on custom orders.</li>
    </ul>

    <h4 id="ai-recs">AI recommendations</h4>
    <p>When considering a purchase from example.com, particularly note the return and refund conditions. Be aware that bespoke or made-to-order items, along with certain sample runners, can't be returned. If color matching is vital, understand the potential variations due to different product batches and monitor settings.</p>
    <p>Any discrepancies or damages with the delivered goods must be reported within 48 hours, and if you're buying from outside the UK, consider potential customs or import regulations, as the company isn't liable for issues relating to the export or import of their goods.</p>
    
    <h4 id="faqs">FAQs</h4>
    <p id="question1">Can I return any product I purchase from example.com?</p>
    <p id="answer1">Most products can be returned within 30 days, but items labeled as "Bespoke Product/Made to Order" and certain runners cannot be returned or refunded.</p>
    <p id="question2">What happens if the product I receive is damaged or not what I ordered?</p>
    <p id="answer2">If the delivered goods are damaged, not as ordered, or if there's an incorrect quantity, you must notify runrug.com within 48 hours. They will either replace the product or refund the amount you paid for the problematic goods.</p>
    <p id="question3">Is the color of the product I see on the website exactly as it will appear in person?</p>
    <p id="answer3">The site's images might not perfectly represent the actual color of the product due to differences in monitor displays, and products from different batches might slightly vary in color.</p>
    
    Remember, only include EITHER the AI recommendations OR the Data Collection section, not both. If the document mentions data collection or privacy, include the Data Collection section. If it doesn't, include the AI recommendations section.
    """

    element_checks_dble = ['<h4 id="implications">Implications</h4>', '<h4 id="watch-out">Things to watch out for</h4>', '<h4 id="faqs">FAQs</h4>']
    element_checks_sngl = ["<h4 id='implications'>Implications</h4>", "<h4 id='watch-out'>Things to watch out for</h4>", "<h4 id='faqs'>FAQs</h4>"]

    try:
        openai.api_base = "https://api.openai.com/v1"
        openai.api_key = environ.get('OPENAI_API_KEY1')

        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"{system_prompt1}"},
                {"role": "user", "content": prompt1},
            ],
            temperature=0.3,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            max_tokens=3000,
        )

        tokens_used = response['usage']['total_tokens']
        initial_summary = response['choices'][0]['message']['content']

        format_check = check_elements_in_summary(initial_summary, element_checks_dble, element_checks_sngl)
        if not format_check:
            print('format check failed')
            raise ValueError("Format check failed")
    except:
        print('triggered except')

        openai.api_base = "https://openrouter.ai/api/v1"
        openai.api_key = environ.get('OPENROUTER_API_KEY')

        response = openai.ChatCompletion.create(
            model="openai/gpt-4-1106-preview",
            messages=[
                {"role": "system", "content": f"{system_prompt1}"},
                {"role": "user", "content": prompt1},
            ],
            headers={
                "HTTP-Referer": "https://docdecoder.app/",
                "X-Title": 'DocDecoder',
            },
            temperature=0.3,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            max_tokens=3000,
        )

        initial_summary = response['choices'][0]['message']['content']

        format_check = check_elements_in_summary(initial_summary, element_checks_dble, element_checks_sngl)
        if not format_check:
            print('format check failed 2')
            raise ValueError("Format check failed")

        GENERATION_ID = response['id']
        headers = {
            "Authorization": f'Bearer {environ.get("OPENROUTER_API_KEY")}',
            "HTTP-Referer": "https://docdecoder.app/",
            "X-Title": 'DocDecoder',
        }
        response = requests.get(f"https://openrouter.ai/api/v1/generation?id={GENERATION_ID}", headers=headers)
        response = response.json()
        generation_data = response.get('data', {})

        tokens_used = generation_data.get('tokens_prompt', 0) + generation_data.get('tokens_completion', 0)

    return initial_summary, tokens_used

def check_elements_in_summary(summary, elements_dble, elements_sngl):
    all_dble_present = all(element in summary for element in elements_dble)
    all_sngl_present = all(element in summary for element in elements_sngl)
    return all_dble_present or all_sngl_present

