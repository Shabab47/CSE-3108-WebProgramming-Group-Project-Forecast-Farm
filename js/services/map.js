async function searchCity(city) {
    const url =
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.length === 0) {
        alert("City not found");
        return;
    }
    const latitude = data[0].lat;
    const longitude = data[0].lon;
    map.setView([latitude, longitude], 13);
    L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(city)
        .openPopup();
}
searchCity("Dhaka");
