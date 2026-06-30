import { BankParser } from './core/BankParser';
import { ParsedTransaction } from './core/types';
import { HDFCMutualFundParser } from './banks/HDFCMutualFundParser';
import { NaviMutualFundParser } from './banks/NaviMutualFundParser';
import { HDFCBankParser } from './banks/HDFCBankParser';
import { SBIBankParser } from './banks/SBIBankParser';
import { SaraswatBankParser } from './banks/SaraswatBankParser';
import { DBSBankParser } from './banks/DBSBankParser';
import { IndianBankParser } from './banks/IndianBankParser';
import { FederalBankParser } from './banks/FederalBankParser';
import { JuspayParser } from './banks/JuspayParser';
import { CashfreeParser } from './banks/CashfreeParser';
import { SliceParser } from './banks/SliceParser';
import { CredParser } from './banks/CredParser';
import { LazyPayParser } from './banks/LazyPayParser';
import { UtkarshBankParser } from './banks/UtkarshBankParser';
import { ICICIBankParser } from './banks/ICICIBankParser';
import { KarnatakaBankParser } from './banks/KarnatakaBankParser';
import { KeralaGraminBankParser } from './banks/KeralaGraminBankParser';
import { IDBIBankParser } from './banks/IDBIBankParser';
import { JupiterBankParser } from './banks/JupiterBankParser';
import { AxisBankParser } from './banks/AxisBankParser';
import { PNBBankParser } from './banks/PNBBankParser';
import { PunjabSindBankParser } from './banks/PunjabSindBankParser';
import { CanaraBankParser } from './banks/CanaraBankParser';
import { BankOfBarodaParser } from './banks/BankOfBarodaParser';
import { BankOfIndiaParser } from './banks/BankOfIndiaParser';
import { JioPaymentsBankParser } from './banks/JioPaymentsBankParser';
import { KotakBankParser } from './banks/KotakBankParser';
import { IDFCFirstBankParser } from './banks/IDFCFirstBankParser';
import { UnionBankParser } from './banks/UnionBankParser';
import { HSBCBankParser } from './banks/HSBCBankParser';
import { CentralBankOfIndiaParser } from './banks/CentralBankOfIndiaParser';
import { SouthIndianBankParser } from './banks/SouthIndianBankParser';
import { JKBankParser } from './banks/JKBankParser';
import { JioPayParser } from './banks/JioPayParser';
import { IPPBParser } from './banks/IPPBParser';
import { CityUnionBankParser } from './banks/CityUnionBankParser';
import { IndianOverseasBankParser } from './banks/IndianOverseasBankParser';
import { AirtelPaymentsBankParser } from './banks/AirtelPaymentsBankParser';
import { IndusIndBankParser } from './banks/IndusIndBankParser';
import { AMEXBankParser } from './banks/AMEXBankParser';
import { OneCardParser } from './banks/OneCardParser';
import { UCOBankParser } from './banks/UCOBankParser';
import { AUBankParser } from './banks/AUBankParser';
import { YesBankParser } from './banks/YesBankParser';
import { BandhanBankParser } from './banks/BandhanBankParser';
import { ADCBParser } from './banks/ADCBParser';
import { FABParser } from './banks/FABParser';
import { EmiratesNBDParser } from './banks/EmiratesNBDParser';
import { EmiratesIslamicParser } from './banks/EmiratesIslamicParser';
import { LivBankParser } from './banks/LivBankParser';
import { CitiBankParser } from './banks/CitiBankParser';
import { DiscoverCardParser } from './banks/DiscoverCardParser';
import { OldHickoryParser } from './banks/OldHickoryParser';
import { LaxmiBankParser } from './banks/LaxmiBankParser';
import { CBEBankParser } from './banks/CBEBankParser';
import { AltanaFCUParser } from './banks/AltanaFCUParser';
import { StandardBankMozambiqueParser } from './banks/StandardBankMozambiqueParser';
import { EMolaParser } from './banks/EMolaParser';
import { MillenniumBimParser } from './banks/MillenniumBimParser';
import { EverestBankParser } from './banks/EverestBankParser';
import { BancolombiaParser } from './banks/BancolombiaParser';
import { MashreqBankParser } from './banks/MashreqBankParser';
import { CharlesSchwabParser } from './banks/CharlesSchwabParser';
import { NavyFederalParser } from './banks/NavyFederalParser';
import { AdelFiParser } from './banks/AdelFiParser';
import { AlecuBankParser } from './banks/AlecuBankParser';
import { PriorbankParser } from './banks/PriorbankParser';
import { AlinmaBankParser } from './banks/AlinmaBankParser';
import { NabilBankParser } from './banks/NabilBankParser';
import { NMBBankParser } from './banks/NMBBankParser';
import { ManjushreeFinanceParser } from './banks/ManjushreeFinanceParser';
import { SiddharthaBankParser } from './banks/SiddharthaBankParser';
import { PrimeCommercialBankParser } from './banks/PrimeCommercialBankParser';
import { MPesaMozambiqueParser } from './banks/MPesaMozambiqueParser';
import { MPesaTanzaniaParser } from './banks/MPesaTanzaniaParser';
import { MPESAParser } from './banks/MPESAParser';
import { SelcomPesaParser } from './banks/SelcomPesaParser';
import { CrdbBankParser } from './banks/CrdbBankParser';
import { TigoPesaParser } from './banks/TigoPesaParser';
import { CIBEgyptParser } from './banks/CIBEgyptParser';
import { DhanlaxmiBankParser } from './banks/DhanlaxmiBankParser';
import { DOPBankParser } from './banks/DOPBankParser';
import { HuntingtonBankParser } from './banks/HuntingtonBankParser';
import { StandardCharteredBankParser } from './banks/StandardCharteredBankParser';
import { EquitasBankParser } from './banks/EquitasBankParser';
import { TelebirrParser } from './banks/TelebirrParser';
import { ZemenBankParser } from './banks/ZemenBankParser';
import { DashenBankParser } from './banks/DashenBankParser';
import { FaysalBankParser } from './banks/FaysalBankParser';
import { MelliBankParser } from './banks/MelliBankParser';
import { MellatBankParser } from './banks/MellatBankParser';
import { ParsianBankParser } from './banks/ParsianBankParser';
import { BankinoBankParser } from './banks/BankinoBankParser';
import { BluBankParser } from './banks/BluBankParser';
import { BangkokBankParser } from './banks/BangkokBankParser';
import { KasikornBankParser } from './banks/KasikornBankParser';
import { SiamCommercialBankParser } from './banks/SiamCommercialBankParser';
import { KrungThaiBankParser } from './banks/KrungThaiBankParser';
import { KrungsriBankParser } from './banks/KrungsriBankParser';
import { TTBBankParser } from './banks/TTBBankParser';
import { GSBBankParser } from './banks/GSBBankParser';
import { BAACBankParser } from './banks/BAACBankParser';
import { UOBThailandParser } from './banks/UOBThailandParser';
import { CIMBThaiParser } from './banks/CIMBThaiParser';
import { KTCCreditCardParser } from './banks/KTCCreditCardParser';
import { TBankParser } from './banks/TBankParser';
import { ChaseBankParser } from './banks/ChaseBankParser';
import { AlRajhiBankParser } from './banks/AlRajhiBankParser';
import { SNBAlAhliBankParser } from './banks/SNBAlAhliBankParser';
import { STCBankParser } from './banks/STCBankParser';
import { SabbBankParser } from './banks/SabbBankParser';
import { MBankCZParser } from './banks/MBankCZParser';
import { SparkasseRheinMaasParser } from './banks/SparkasseRheinMaasParser';
import { EnparaBankParser } from './banks/EnparaBankParser';
import { BankMuscatParser } from './banks/BankMuscatParser';
import { GreaterBankParser } from './banks/GreaterBankParser';
import { BPCEParser } from './banks/BPCEParser';
import { SampathBankParser } from './banks/SampathBankParser';
import { AccessBankParser } from './banks/AccessBankParser';
import { ZenithBankParser } from './banks/ZenithBankParser';
import { KeystoneBankParser } from './banks/KeystoneBankParser';
import { JaizBankParser } from './banks/JaizBankParser';
import { OpayBankParser } from './banks/OpayBankParser';

const parsers: BankParser[] = [
  new HDFCMutualFundParser(),
  new NaviMutualFundParser(),
  new HDFCBankParser(),
  new SBIBankParser(),
  new SaraswatBankParser(),
  new DBSBankParser(),
  new IndianBankParser(),
  new FederalBankParser(),
  new JuspayParser(),
  new CashfreeParser(),
  new SliceParser(),
  new CredParser(),
  new LazyPayParser(),
  new UtkarshBankParser(),
  new ICICIBankParser(),
  new KarnatakaBankParser(),
  new KeralaGraminBankParser(),
  new IDBIBankParser(),
  new JupiterBankParser(),
  new AxisBankParser(),
  new PNBBankParser(),
  new PunjabSindBankParser(),
  new CanaraBankParser(),
  new BankOfBarodaParser(),
  new BankOfIndiaParser(),
  new JioPaymentsBankParser(),
  new KotakBankParser(),
  new IDFCFirstBankParser(),
  new UnionBankParser(),
  new HSBCBankParser(),
  new CentralBankOfIndiaParser(),
  new SouthIndianBankParser(),
  new JKBankParser(),
  new JioPayParser(),
  new IPPBParser(),
  new CityUnionBankParser(),
  new IndianOverseasBankParser(),
  new AirtelPaymentsBankParser(),
  new IndusIndBankParser(),
  new AMEXBankParser(),
  new OneCardParser(),
  new UCOBankParser(),
  new AUBankParser(),
  new YesBankParser(),
  new BandhanBankParser(),
  new ADCBParser(),
  new FABParser(),
  new EmiratesNBDParser(),
  new EmiratesIslamicParser(),
  new LivBankParser(),
  new CitiBankParser(),
  new DiscoverCardParser(),
  new OldHickoryParser(),
  new LaxmiBankParser(),
  new CBEBankParser(),
  new AltanaFCUParser(),
  new StandardBankMozambiqueParser(),
  new EMolaParser(),
  new MillenniumBimParser(),
  new EverestBankParser(),
  new BancolombiaParser(),
  new MashreqBankParser(),
  new CharlesSchwabParser(),
  new NavyFederalParser(),
  new AdelFiParser(),
  new AlecuBankParser(),
  new PriorbankParser(),
  new AlinmaBankParser(),
  new NabilBankParser(),
  new NMBBankParser(),
  new ManjushreeFinanceParser(),
  new SiddharthaBankParser(),
  new PrimeCommercialBankParser(),
  new MPesaMozambiqueParser(),
  new MPesaTanzaniaParser(),
  new MPESAParser(),
  new SelcomPesaParser(),
  new CrdbBankParser(),
  new TigoPesaParser(),
  new CIBEgyptParser(),
  new DhanlaxmiBankParser(),
  new DOPBankParser(),
  new HuntingtonBankParser(),
  new StandardCharteredBankParser(),
  new EquitasBankParser(),
  new TelebirrParser(),
  new ZemenBankParser(),
  new DashenBankParser(),
  new FaysalBankParser(),
  new MelliBankParser(),
  new MellatBankParser(),
  new ParsianBankParser(),
  new BankinoBankParser(),
  new BluBankParser(),
  new BangkokBankParser(),
  new KasikornBankParser(),
  new SiamCommercialBankParser(),
  new KrungThaiBankParser(),
  new KrungsriBankParser(),
  new TTBBankParser(),
  new GSBBankParser(),
  new BAACBankParser(),
  new UOBThailandParser(),
  new CIMBThaiParser(),
  new KTCCreditCardParser(),
  new TBankParser(),
  new ChaseBankParser(),
  new AlRajhiBankParser(),
  new SNBAlAhliBankParser(),
  new STCBankParser(),
  new SabbBankParser(),
  new MBankCZParser(),
  new SparkasseRheinMaasParser(),
  new EnparaBankParser(),
  new BankMuscatParser(),
  new GreaterBankParser(),
  new BPCEParser(),
  new SampathBankParser(),
  new AccessBankParser(),
  new ZenithBankParser(),
  new KeystoneBankParser(),
  new JaizBankParser(),
  new OpayBankParser(),
];

export const BankParserFactory = {
  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    return this.getParsers(sender).reduce<ParsedTransaction | null>(
      (acc, p) => acc ?? p.parse(smsBody, sender, timestamp),
      null
    );
  },

  getParsers(sender: string): BankParser[] {
    return parsers.filter(p => p.canHandle(sender));
  },

  getParser(sender: string): BankParser | null {
    return parsers.find(p => p.canHandle(sender)) ?? null;
  },

  getParserByName(bankName: string): BankParser | null {
    return parsers.find(p => p.getBankName() === bankName) ?? null;
  },

  isKnownBankSender(sender: string): boolean {
    return parsers.some(p => p.canHandle(sender));
  },

  getAllParsers(): BankParser[] {
    return [...parsers];
  },
};
