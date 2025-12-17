import Counter from '@/models/Counter';
import Settings from '@/models/Settings';

export enum CounterName {
  QUOTATION = 'quotation',
  JOB = 'job',
  ESTIMATE = 'estimate',
  CHALLAN = 'challan',
}

const DEFAULT_PREFIX_MAP: Record<CounterName, string> = {
  [CounterName.QUOTATION]: 'Q',
  [CounterName.JOB]: 'J',
  [CounterName.ESTIMATE]: 'E',
  [CounterName.CHALLAN]: 'C',
};

export async function getNextSequenceNumber(
  adminId: string,
  counterName: CounterName
): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { adminId, name: counterName },
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const sequenceValue = counter.sequenceValue;
  
  // Get prefix from settings or use default
  let prefix = DEFAULT_PREFIX_MAP[counterName];
  const settings = await Settings.findOne({ adminId });
  
  if (settings) {
    if (counterName === CounterName.QUOTATION && settings.quotationPrefix) {
      prefix = settings.quotationPrefix;
    } else if (counterName === CounterName.JOB && settings.jobPrefix) {
      prefix = settings.jobPrefix;
    } else if (counterName === CounterName.ESTIMATE && settings.estimatePrefix) {
      prefix = settings.estimatePrefix;
    } else if (counterName === CounterName.CHALLAN && settings.challanPrefix) {
      prefix = settings.challanPrefix;
    }
  }
  
  const formattedNumber = String(sequenceValue).padStart(3, '0');

  return `${prefix}-${formattedNumber}`;
}

export async function resetCounter(
  adminId: string,
  counterName: CounterName,
  startingNumber: number = 0
): Promise<void> {
  // Set sequenceValue to startingNumber - 1 because getNextSequenceNumber increments first
  // So if startingNumber is 1, we set to 0, and next will be 1
  // If startingNumber is 100, we set to 99, and next will be 100
  const sequenceValue = Math.max(0, startingNumber - 1);
  
  await Counter.findOneAndUpdate(
    { adminId, name: counterName },
    { sequenceValue },
    { upsert: true }
  );
}
