const UPI_ID = "mugil26052016@okicici";
const PAYEE_NAME = "Shalini Tuition Center";

document.getElementById("payNowBtn").addEventListener("click", () => {

  const upiLink =
    "upi://pay?pa=" + encodeURIComponent(UPI_ID) +
    "&pn=" + encodeURIComponent(PAYEE_NAME) +
    "&cu=INR";

  window.location.href = upiLink;

});

document.getElementById("copyBtn").addEventListener("click", async () => {

  const message = document.getElementById("copyMessage");

  try {
    await navigator.clipboard.writeText(UPI_ID);
    message.textContent = "UPI ID copied successfully!";
  } catch (error) {
    message.textContent = "Please copy UPI ID manually: " + UPI_ID;
  }

});
