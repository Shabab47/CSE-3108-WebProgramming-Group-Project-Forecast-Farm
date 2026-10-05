async function getTime() {
    try {
        const response = await fetch(
            "https://timeapi.io/api/now/Asia/Dhaka"
        );
        const data = await response.json();
        document.getElementById("time").innerHTML = `
            <h2>${data.datetime}</h2>
            <p>Timezone: ${data.timezone}</p>
            <p>Abbreviation: ${data.abbreviation}</p>
        `;
    } catch (error) {
        document.getElementById("time").innerHTML =
            "Error: " + error.message;
    }
}
