const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const port = process.env.PORT || 3000;

const NUMBER_OF_DAYS = 14;

var data = {
    location: "",
    source: "BBC",
    today_hourly_data: [],
    next_days_data: [],
};

const getWeather = (res) => {
    axios.get(`https://ipinfo.io/`).then((response) => {
        const html = response.data
        let my_city = html.city
        getWeatherByLocation(my_city, res)
    })
}

const getWeatherByLocation = async (location, res) => {

    axios.get(`https://www.bbc.com/weather/search?s=${location}`).then((res) => {
        const html = res.data
        const $ = cheerio.load(html)

        let location_code = $('.location-search-results__result__link').attr("href")

        axios.get(`https://www.bbc.com/weather/${location_code}`).then((response) => {
            const html = response.data;
            const $ = cheerio.load(html);

            let city = $("#wr-location-name-id").text().split("-")[0].trim();
            data.location = city;

            //----------------------------------------------

            $(".wr-time-slot", html).each(function () {
                const Humidity_pressure_precipatation = []
                $(this).find(".wr-time-slot-secondary__value").each(function () { Humidity_pressure_precipatation.push($(this).text()) })
                var hourly_data = {
                    time: $(this).find(".wr-time-slot-primary__time").text(),
                    degrees: [
                        {
                            c: $(this).find(".wr-value--temperature--c").text(),
                        },
                        {
                            f: $(this).find(".wr-value--temperature--f").text()
                        }
                    ],
                    Humidity: Humidity_pressure_precipatation[0],
                    Pressure: Humidity_pressure_precipatation[1],
                    Visibility: Humidity_pressure_precipatation[2],
                    precipitation: $(this).find(".wr-time-slot-secondary__chance-of-rain-value").text(),
                    breeze: $(this).find(".wr-time-slot-secondary__wind-direction").text(),
                };

                data.today_hourly_data.push(hourly_data)

            });

            //----------------------------------------------------//

            for (var day_no = 0; day_no <= NUMBER_OF_DAYS; day_no++) {
                $(`.wr-day--${day_no}`, html).each(function () {
                    const results = $(this).text().split(",");
                    data.next_days_data.push({
                        day: results[0],
                        weather_type: results[1],
                        temperature: results[2],
                        wind: results[3],

                    });
                });
            }

            //---------------------------------------------------//

        });

    });

    res.json(data);

}

//--------------------------------------------------//

app.get("/", (req, res) => {
    res.json("Welcome to the weatherAPI!!");
});

app.get("/weather", (req, res) => {
    getWeather(res);
})

app.get("/weather/:location", (req, res) => {
    const query = req.params.location
    getWeatherByLocation(query, res)
});

app.get("/weather/id/:id", (req, res) => {
    const id = Number(req.params.id);
    var selected_data = {
        location: data.location,
        source: data.source,
        data: data.next_days_data[id],
    };
    res.json(selected_data);
});

app.listen(port, () => {
    console.log(`Sever alive on port ${port}`);
});