package com.gns.sirh.service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Générateur PDF minimal sans dépendance externe (syntaxe PDF 1.4, polices Helvetica).
 * Produit un document A4 proprement mis en forme : en-tête société, titre, lignes de contenu,
 * date et bloc signature.
 */
public final class PdfGenerator {

    private PdfGenerator() {
    }

    public static byte[] generate(String enTeteSociete, String titre, List<String> lignes, String piedDePage) {
        return generate(enTeteSociete, titre, lignes, piedDePage, null, null);
    }

    /**
     * Génère un document A4 : en-tête société + sous-titre, titre, corps, et bloc de
     * signature numérique de l'administration (signataire + date) si fournis.
     */
    public static byte[] generate(String enTeteSociete, String titre, List<String> lignes, String piedDePage,
                                  String signataire, String dateSignature) {
        StringBuilder content = new StringBuilder();

        // En-tête société (Helvetica-Bold 18)
        content.append("BT /F1 18 Tf 50 794 Td (")
                .append(esc(enTeteSociete))
                .append(") Tj ET\n");

        // Sous-titre société (Helvetica 9)
        content.append("BT /F2 9 Tf 50 778 Td (")
                .append(esc("Portail SIRH - Siege : Casablanca, Maroc  |  contact@gns.ma  |  +212 5 22 00 00 00"))
                .append(") Tj ET\n");

        // Sous-ligne décorative (trait)
        content.append("1.2 w 50 768 m 545 768 l S\n");

        // Date d'émission (à droite du titre)
        content.append("BT /F2 9 Tf 400 750 Td (")
                .append(esc(java.time.LocalDate.now().toString()))
                .append(") Tj ET\n");

        // Titre du document (Helvetica-Bold 14)
        content.append("BT /F1 14 Tf 50 736 Td (")
                .append(esc(titre))
                .append(") Tj ET\n");

        // Corps du document (Helvetica 11), lignes enveloppées à ~95 caractères
        double y = 690;
        for (String raw : lignes) {
            for (String ligne : wrap(raw, 95)) {
                content.append("BT /F2 11 Tf 50 ")
                        .append(String.format(java.util.Locale.ROOT, "%.0f", y))
                        .append(" Td (")
                        .append(esc(ligne))
                        .append(") Tj ET\n");
                y -= 17;
                if (y < 110) {
                    break;
                }
            }
        }

        // Bloc date + signature
        y = Math.max(y, 130);
        if (signataire != null && !signataire.isBlank()) {
            // Pied : lieu + date
            content.append("BT /F2 10 Tf 50 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", y - 6))
                    .append(" Td (")
                    .append(esc(piedDePage))
                    .append(") Tj ET\n");

            // Encadré du bloc signature numérique (côté droit)
            double sy = y - 26;
            content.append("0.8 w 350 ").append(String.format(java.util.Locale.ROOT, "%.0f", sy + 32))
                    .append(" m 545 ").append(String.format(java.util.Locale.ROOT, "%.0f", sy + 32)).append(" l S\n");
            content.append("BT /F2 8 Tf 355 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", sy + 24))
                    .append(" Td (Signature numerique de l'administration) Tj ET\n");
            content.append("BT /F2 9 Tf 355 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", sy + 8))
                    .append(" Td (")
                    .append(esc(signataire))
                    .append(") Tj ET\n");
            content.append("BT /F2 8 Tf 355 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", sy - 4))
                    .append(" Td (")
                    .append(esc(dateSignature != null ? dateSignature : ""))
                    .append(") Tj ET\n");
            content.append("1 w 355 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", sy - 18))
                    .append(" m 540 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", sy - 18))
                    .append(" l S\n");
            content.append("BT /F2 8 Tf 355 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", sy - 26))
                    .append(" Td (Signature et cachet de la Direction RH) Tj ET\n");
        } else {
            // Bloc signature générique (document non signé)
            content.append("BT /F2 10 Tf 350 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", y - 10))
                    .append(" Td (")
                    .append(esc(piedDePage))
                    .append(") Tj ET\n");
            content.append("1 w 350 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", y - 30))
                    .append(" m 545 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", y - 30))
                    .append(" l S\n");
            content.append("BT /F2 9 Tf 350 ")
                    .append(String.format(java.util.Locale.ROOT, "%.0f", y - 38))
                    .append(" Td (Signature) Tj ET\n");
        }

        byte[] streamBytes = content.toString().getBytes(StandardCharsets.ISO_8859_1);
        int length = streamBytes.length;

        String body = "%PDF-1.4\n"
                + "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
                + "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
                + "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n"
                + "   /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>\n"
                + "   /Contents 6 0 R >>\nendobj\n"
                + "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"
                + "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
                + "6 0 obj\n<< /Length " + length + " >>\nstream\n"
                + content
                + "endstream\nendobj\n";

        byte[] bodyBytes = body.getBytes(StandardCharsets.ISO_8859_1);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(bodyBytes);
        long xrefOffset = bodyBytes.length;

        StringBuilder xref = new StringBuilder("xref\n0 7\n0000000000 65535 f \n");
        long offset = 0;
        String[] lines = new String(bodyBytes, StandardCharsets.ISO_8859_1).split("\n");
        for (String line : lines) {
            if (line.matches("\\d+ 0 obj")) {
                xref.append(String.format(java.util.Locale.ROOT, "%010d 00000 n \n", offset));
            }
            offset += line.getBytes(StandardCharsets.ISO_8859_1).length + 1;
        }
        xref.append("trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n").append(xrefOffset).append("\n%%EOF");

        out.writeBytes(xref.toString().getBytes(StandardCharsets.ISO_8859_1));
        return out.toByteArray();
    }

    // private static String esc(String s) {
    //     if (s == null) {
    //         return "";
    //     }
    //     return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    // }

    private static String esc(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '(' -> sb.append("\\(");
                case ')' -> sb.append("\\)");
                case '\u2014', '\u2013' -> sb.append('-');          // — et – → -
                case '\u2019', '\u2018' -> sb.append('\'');        // ’ et ‘ → '
                case '\u201C', '\u201D' -> sb.append('"');         // “ et ” → "
                case '\u2026' -> sb.append("...");                 // … → ...
                default -> {
                    if (c <= 0xFF) {
                        sb.append(c);                              // é, è, à, ç, ô… conservés
                    } else {
                        sb.append('?');                            // hors ISO-8859-1
                    }
                }
            }
        }
        return sb.toString();
    }


    private static List<String> wrap(String text, int max) {
        List<String> result = new ArrayList<>();
        if (text == null || text.isBlank()) {
            result.add("");
            return result;
        }
        String[] words = text.split(" ");
        StringBuilder current = new StringBuilder();
        for (String w : words) {
            if (current.length() + w.length() + 1 > max && current.length() > 0) {
                result.add(current.toString());
                current = new StringBuilder();
            }
            if (current.length() > 0) {
                current.append(' ');
            }
            current.append(w);
        }
        result.add(current.toString());
        return result;
    }
}
