import { navigationRef } from '../navigation/navigationRef';
import { stopMedicine, updateMedicineTiming, getMedicines, deleteMedicine } from '../db/queries/medicines';
import { deleteScanResult, getScanHistory as getReports } from '../db/queries/reports';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { useVoiceStore } from '../store/voiceStore';

// Action execution functions
export async function executeAction(action: string, params: any, patientContext: any): Promise<string> {
  const patient = usePatientStore.getState().patient;
  const language = useLanguageStore.getState().language;

  try {
    switch (action) {
      case 'stop_medicine':
        if (params.medicineName) {
          const medicines = getMedicines(patient?.id || 0);
          const med = medicines.find((m: any) => m.name.toLowerCase().includes(params.medicineName.toLowerCase()));
          if (med) {
            stopMedicine(med.id, params.reason || 'Stopped by AI assistant');
            return `✅ ${med.name} को रोक दिया गया है।`;
          }
        }
        return `❌ यह दवाई नहीं मिली।`;

      case 'delete_medicine':
        if (params.medicineName) {
          const medicines = getMedicines(patient?.id || 0);
          const med = medicines.find((m: any) => m.name.toLowerCase().includes(params.medicineName.toLowerCase()));
          if (med) {
            deleteMedicine(med.id);
            return `✅ ${med.name} को हटा दिया गया है।`;
          }
        }
        return `❌ यह दवाई नहीं मिली।`;

      case 'update_medicine_timing':
        if (params.medicineName && params.newTimes) {
          const medicines = getMedicines(patient?.id || 0);
          const med = medicines.find((m: any) => m.name.toLowerCase().includes(params.medicineName.toLowerCase()));
          if (med) {
            updateMedicineTiming(med.id, params.newTimes);
            return `✅ ${med.name} का समय बदलकर ${params.newTimes.join(', ')} कर दिया गया है।`;
          }
        }
        return `❌ यह दवाई नहीं मिली।`;

      case 'delete_report':
        if (params.reportId) {
          deleteScanResult(params.reportId);
          return `✅ रिपोर्ट हटा दी गई है।`;
        }
        return `❌ रिपोर्ट नहीं मिली।`;

      case 'navigate_to_screen':
        if (params.screenName) {
          const screenMap: Record<string, string> = {
            'medicine_scan': 'QuickScan',
            'report_scan': 'ReportScan',
            'chat': 'Chat',
            'medicines': 'Medicines',
            'home': 'Home',
            'settings': 'Profile'
          };
          const screen = screenMap[params.screenName] || params.screenName;
          navigationRef.navigate(screen as never);
          return `✅ ${params.screenName} स्क्रीन खोल दी गई है।`;
        }
        return `❌ स्क्रीन नहीं मिली।`;

      case 'get_medicine_insights':
        const medicines = getMedicines(patient?.id || 0);
        const insights = medicines.map((med: any) => {
          const doseTimes = JSON.parse(med.dose_times || '[]');
          return `${med.name}: ${med.dose_amount} ${med.dose_unit} at ${doseTimes.join(', ')}`;
        });
        return `आपकी दवाइयाँ:\n${insights.join('\n')}`;

      case 'get_health_analysis':
        const meds = getMedicines(patient?.id || 0);
        const reports = getReports(patient?.id || 0);
        const analysis = `आपकी ${meds.length} दवाइयाँ हैं और ${reports.length} रिपोर्ट्स सेव हैं।`;
        return analysis;

      default:
        return `❌ यह एक्शन समझ में नहीं आया।`;
    }
  } catch (error) {
    return `❌ एक्शन पूरा नहीं हो सका: ${error}`;
  }
}