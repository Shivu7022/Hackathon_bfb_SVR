/**
 * CropGuard AI - PDF Report Generator
 * Uses jsPDF and jsPDF-AutoTable
 */

async function downloadReport(crop, disease, severity, region, timestamp, recommendation = null) {
    console.log("PDF Generation Started:", { crop, disease, severity, region, timestamp, recommendation });
    
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.error("jsPDF library not found!");
            alert("Error: PDF library not loaded. Please refresh the page.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Formatting Helpers
        const primaryColor = [22, 163, 74]; // #16a34a
        const secondaryColor = [30, 41, 59]; // #1e293b
        const accentColor = [13, 110, 253];

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("CropGuard AI", 20, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Smart Agriculture Health Report", 20, 32);

        // Date/Time
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 140, 50);

        // Section: Crop Details
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Crop Health Summary", 20, 60);

        doc.autoTable({
            startY: 65,
            head: [['Field', 'Value']],
            body: [
                ['Crop Type', crop],
                ['Diagnosis', disease],
                ['Severity Level', severity],
                ['Farm Region', region],
                ['Detection Time', timestamp]
            ],
            headStyles: { fillColor: primaryColor },
            theme: 'striped'
        });

        // Section: Weather Context
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Environmental Context", 20, finalY);

        const weatherData = recommendation && recommendation.explanation.includes('temperature') 
            ? [
                ['Temperature', recommendation.explanation.match(/temperature ~(\d+)/)?.[1] + '°C' || 'N/A'],
                ['Humidity', recommendation.explanation.match(/humidity ~(\d+)/)?.[1] + '%' || 'N/A'],
                ['Soil Insight', recommendation.explanation.includes('Soil') ? 'Review Needed' : 'Normal'],
                ['Risk Level', severity.toUpperCase()]
              ]
            : [
                ['Temperature', 'N/A'],
                ['Humidity', 'N/A'],
                ['Soil Moisture', 'N/A'],
                ['Light Intensity', 'N/A']
            ];

        doc.autoTable({
            startY: finalY + 5,
            head: [['Metric', 'Measurement']],
            body: weatherData,
            headStyles: { fillColor: [59, 130, 246] },
            theme: 'grid'
        });

        // Section: Analysis & Recommendations
        finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Analysis & Recommended Solutions", 20, finalY);

        // Detailed Analysis from Model
        const analysisText = recommendation ? recommendation.explanation : "Detailed analysis is being compiled by our AI engine.";
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Detailed Analysis:", 20, finalY + 12);
        doc.setFont("helvetica", "normal");
        const splitAnalysis = doc.splitTextToSize(analysisText, 170);
        doc.text(splitAnalysis, 20, finalY + 20);

        // Action Plan from Model
        let planY = finalY + 20 + (splitAnalysis.length * 7) + 10;
        if (planY > 250) { doc.addPage(); planY = 30; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Recommended Action Plan:", 20, planY);

        if (recommendation) {
            const planLines = [
                `• Primary Treatment: ${recommendation.pesticide}`,
                `• Dosage: ${recommendation.dosePerLitreMl}ml per litre of water.`,
                `• Frequency: Every ${recommendation.intervalDays} days.`,
                `• Total applications: ${recommendation.sprays} sprays recommended.`,
                `• Note: ${recommendation.explanation.includes('Rain') ? 'RAIN ALERT: Adjust spraying schedule to avoid washout.' : 'Proceed with regular application.'}`
            ];
            doc.setFont("helvetica", "normal");
            doc.text(planLines, 25, planY + 10);
        } else {
            doc.setFont("helvetica", "normal");
            doc.text("Monitor crop daily. Consult with a local agronomist if symptoms worsen.", 20, planY + 10);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("This report is generated by CropGuard AI for screening purposes. Always verify with field inspection.", 20, 285);

        // Save with fallback
        const cleanCrop = crop.replace(/[^a-z0-9]/gi, '_');
        const fileName = `CropGuard_Report_${cleanCrop}_${Date.now()}.pdf`;
        doc.save(fileName);
        console.log("PDF Saved successfully:", fileName);

    } catch (error) {
        console.error("Critical error in PDF generation:", error);
        alert("Sorry, we encountered an error while generating the report. Please try again or check the browser console.");
    }
}
