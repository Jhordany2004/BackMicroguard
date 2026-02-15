const formatDatePeru = (date) => {
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));

  const get = (type) => parts.find(p => p.type === type)?.value;

  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
};
module.exports = { formatDatePeru };
