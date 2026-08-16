const API_ENDPOINT =
    "https://markplace.site/api.php";


export default async function handler(request) {

    /*
     * Only GET requests
     */

    if (request.method !== "GET") {

        return json(
            {
                success: false,
                error: "Method not allowed"
            },
            405
        );
    }


    try {

        const url =
            new URL(request.url);


        const number =
            url.searchParams
                .get("num")
                ?.trim();


        /*
         * Number required
         */

        if (!number) {

            return json(
                {
                    success: false,
                    error:
                        "Please enter a number."
                },
                400
            );
        }


        /*
         * Basic validation
         */

        if (
            !/^[0-9+\-\s()]{3,30}$/
                .test(number)
        ) {

            return json(
                {
                    success: false,
                    error:
                        "Invalid number format."
                },
                400
            );
        }


        /*
         * API KEY
         *
         * Netlify dashboard se aayegi.
         */

        const apiKey =
            process.env.NUMBER_API_KEY;


        if (!apiKey) {

            console.error(
                "NUMBER_API_KEY is missing."
            );


            return json(
                {
                    success: false,
                    error:
                        "Server API configuration is missing."
                },
                500
            );
        }


        /*
         * Build external API URL
         */

        const apiUrl =
            new URL(API_ENDPOINT);


        apiUrl.searchParams.set(
            "key",
            apiKey
        );

        apiUrl.searchParams.set(
            "type",
            "number"
        );

        apiUrl.searchParams.set(
            "num",
            number
        );


        /*
         * Call API
         */

        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                15000
            );


        let apiResponse;


        try {

            apiResponse =
                await fetch(
                    apiUrl.toString(),
                    {
                        method: "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        signal:
                            controller.signal
                    }
                );

        } finally {

            clearTimeout(timeout);
        }


        /*
         * Read response
         */

        const responseText =
            await apiResponse.text();


        let data;


        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch {

            data =
                responseText;
        }


        /*
         * Upstream error
         */

        if (!apiResponse.ok) {

            return json(
                {
                    success: false,

                    error:
                        `Lookup API returned HTTP ${apiResponse.status}`,

                    data
                },

                502
            );
        }


        /*
         * Success
         */

        return json(
            {
                success: true,

                searchedNumber:
                    number,

                data
            },

            200
        );


    } catch (error) {

        console.error(
            "Lookup error:",
            error?.message
        );


        if (
            error?.name ===
            "AbortError"
        ) {

            return json(
                {
                    success: false,
                    error:
                        "Lookup request timed out."
                },
                504
            );
        }


        return json(
            {
                success: false,
                error:
                    "Unable to contact lookup service."
            },
            502
        );
    }
}


/*
 * JSON helper
 */

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),

        {
            status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                "Cache-Control":
                    "no-store"
            }
        }
    );
}
