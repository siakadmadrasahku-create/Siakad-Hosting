/**
 * Fungsi standar untuk mengubah angka menjadi teks terbilang Bahasa Indonesia
 */
export const terbilang = (nominal: number): string => {
  const n = Math.floor(Math.abs(nominal));
  if (n === 0) return "Nol Rupiah";

  const baca = (angka: number): string => {
    const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let hasil = "";

    if (angka < 12) {
      hasil = " " + bilangan[angka];
    } else if (angka < 20) {
      hasil = baca(angka - 10) + " Belas";
    } else if (angka < 100) {
      hasil = baca(Math.floor(angka / 10)) + " Puluh" + baca(angka % 10);
    } else if (angka < 200) {
      hasil = " Seratus" + baca(angka - 100);
    } else if (angka < 1000) {
      hasil = baca(Math.floor(angka / 100)) + " Ratus" + baca(angka % 100);
    } else if (angka < 2000) {
      hasil = " Seribu" + baca(angka - 1000);
    } else if (angka < 1000000) {
      hasil = baca(Math.floor(angka / 1000)) + " Ribu" + baca(angka % 1000);
    } else if (angka < 1000000000) {
      hasil = baca(Math.floor(angka / 1000000)) + " Juta" + baca(angka % 1000000);
    } else if (angka < 1000000000000) {
      hasil = baca(Math.floor(angka / 1000000000)) + " Miliar" + baca(angka % 1000000000);
    } else if (angka < 1000000000000000) {
      hasil = baca(Math.floor(angka / 1000000000000)) + " Triliun" + baca(angka % 1000000000000);
    }

    return hasil;
  };

  const finalResult = baca(n).replace(/\s+/g, ' ').trim();
  return finalResult + " Rupiah";
};