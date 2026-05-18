
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const PLAYERS_LIST = `
nikitha.prasuja@gmail.com|9884009809
bharath16122003@gmail.com|7358670863
rajeshyadav12212004@gmail.com|9150992346
sathishknba@gmail.com|8825509912
abishaksm@gmail.com|8838285371
saisabareesha1698@gmail.com|9080640458
mohammedihsan752@gmail.com|7200215821
manojkumar.mylsamy@gmail.com|8056161314
jayasuryatrg@gmail.com|9360504753
hari180500@gmail.com|9551685461
rajesh.e.12@gmail.com|8778684164
manojkishore028@gmail.com|8807782593
bharat07infinity@gmail.com|8968658599
muralidharan.a0403@gmail.com|8072572122
ehsanilahi188@gmail.com|9940475908
hussain.qw@gmail.com|8148626231
manimanoj1112@gmail.com|8939201108
raj1117107@gmail.com|8056105501
shouibms133@gmail.com|6374952148
mvirfan@gmail.com|9941757103
vignesh3307@gmail.com|8681805286
sarveshwaran29@gmail.com|9840281674
lakshithgelada@gmail.com|8124139689
dharishhari1212@gmail.com|9677276849
jaffijaffar28@gmail.com|7871588838
bharathiram704@gmail.com|9597155787
karthik99mishra@gmail.com|9677184613
vijayvicky894@gmail.com|9787050818
kuppansv12@gmail.com|8072332856
aryandasgupta10@gmail.com|9042070566
hariharanravi168@gmail.com|9445778177
mskugan380@gmail.com|8939146149
sankarm01978@email.com|9789178789
sashidhar_ganesh@yahoo.co.in|9500005943
timothy256k@gmail.com|7200659943
sabhijithbalaji1605@gmail.com|9789049239
bvignesh2000@gmail.com|9597523071
asifmanni2001@gmail.com|7010406957
dhanuj2007@gmail.com|9342600204
nagaraj2321979@gmail.com|8015357243
madhan.acl@gmail.com|9940304098
vasumathy.manikandan@gmail.com|9344143445
hansiejoshuasamuel@gmail.com|7338883552
vsushwanth831@gmail.com|9840060551
ajayaadhithiyan611@gmail.com|9384613943
joel.ebenarthur@gmail.com|9629322049
thedarkrelevant@gmail.com|8248965667
liyanileo7@gmail.com|7598029641
shaheen.197714@gmail.com|9884261173
thavithkumar67@gmail.com|9677295653
lachuragu.1009@gmail.com|9566943542
manee.prithvi@gmail.com|9282104111
lakshman2k47@gmail.com|8098256207
devalingam2001@gmail.com|9361580154
johncruz1503@gmail.com|8248821780
kalaiselvan19011999@gmail.com|7639408676
sanjayraghavendar2@gmail.com|9629141885
sharmilajunu@gmail.com|7305432322
ramaravindh2000@gmail.com|9841148834
krishnanharithiru@gmail.com|9841881927
jeromandrew7@gmail.com|6380996191
iahamed857@gmail.com|7418017473
karthicksteyn19@gmail.com|7358776632
monishrock6@gmail.com|8754809404
vikramnarayanasamy17@gmail.com|9499006576
arrajun610@gmail.com|9790826894
sripaul.aug18@gmail.com|8754081893
rockchanthuru@gamil.com|7867834374
madhan9965970161@gmail.com|9344832856
elangosaran11@gmail.com|8667470127
sarath2002anand@gmail.com|7092255007
nmohd008@gmail.com|9025613043
shoban182007@gamil.com|9342526643
mohamedameen496@gmail.com|6383576228
nithinsandy06@gmail.com|7550194913
gopin9050@gmail.com|9344877867
danielprashanth07@gmail.com|9344530271
bhuvanatmk15@gmail.com|8489849010
r.appuvilla9090@gmail.com|9677298629
yatinkrishnagh@gmail.com|9176703431
sureshdon550@gmail.com|9962046268
kalaivanankalaivanan023@gmail.com|7305630404
hemraj24203@gamil.com|7826828687
naranprohith@gmail.com|9884415491
anishravi4u@gmail.com|9176238419
anandhb2000@gmail.com|9360850029
riyaskhan3042@gmail.com|6369857030
kawanderbalakrishna@gmail.com|8879133898
massmuhilan7@gmail.com|8220966635
joneprathap07@gmail.com|8073904020
gopigokul7373@gmail.com|7395986608
prakashsiva653@gmail.com|8825985064
abduljamshid720@gmail.com|8939116831
rohithparekh@gmail.com|9884365004
gunapriya04042003@gmail.com|8754016689
vikiiroop786@gmail.com|9677284358
seenivasan15041969@gmail.com|6379915085
ilavarasan.ila7690@gmail.com|9344828306
mkalaiyarasan92@gmail.com|9940282738
sarathponraj1999@gmail.com|9791669766
arunneelagandan26@gmail.com|8870216122
lovingcouples61@gmail.com|9176445018
anand7mps@gmail.com|9384676780
ajithkumarajith3347@gmail.com|9629279184
surajamulraj10@gmail.com|8939576528
srisakthi31july2004@gmail.com|8124873445
roman63818@gmail.com|9514176381
actionmanikandan@gmail.com|8925866698
vickypk91@gmail.com|8056252539
murugan.6374052122@gmail.com|6374052122
balaseeika2028@gmail.com|9789805787
srreena2819@gmail.com|7904982271
gopinath.smvec18@gmail.com|9500643318
rahulrio900@gmail.com|9003078172
lionelbharath@gmail.com|9344405562
akashorton333@gmail.com|6385355505
poovaipandiya@gmail.com|9962892792
rasulvj@gmail.com|8056197524
shiyamkumars@gmail.com|7708404331
ek.rambala@gmail.com|9994831480
senthilkumar261994@gmail.com|7845116144
arunmba2093@gmail.com|9962109492
ramprawinu@gmail.com|8939475511
kishoresamuel616@gmail.com|8925385463
madhugeetha308@gmail.com|8098827639
zaynimu10@gmail.com|9500093302
kathirdurai22@gmail.com|6369495790
yogeshyoki1997@gmail.com|7010574754
arishithbabu@gmail.com|9443709483
mathichinnadurai78@gmail.com|7708130635
j.panneerselvam23696@gmail.com|9025732408
senthilkumarrohan@gmail.com|7598681598
sanjayboopathi21@gmail.com|9789017213
aswinpandi006@gmail.com|9159567785
sethaskncc@gmail.com|9150119416
lawrencenova7@gmail.com|9952007496
rptradersmd@gmail.com|9944187436
rameshkr1201@gmail.com|9840316362
pughalpughal17@gmail.com|9585698671
berlinprabu@gmail.com|9840876800
pkthirupillai1008@gmail.com|9345286965
gopalguna0@gmail.com|9025614317
prakashprakash4646219@gmail.com|8122608667
kamalnathvarma8@gmail.com|8778605696
vibinraj108@gmail.com|9566466508
avulakuniranjan@gmail.com|8247761902
kamalesh4191@gmail.com|9789984846
prasadenterprises1505@gmail.com|8220340858
rajeshkhanna.sundar@gmail.com|9087111133
artistpraveen16@gmail.com|9600191690
hemanthsrini0808@gmail.com|9345681622
sathish.victory123@gmail.com|9597165849
sivasiva11292@gmail.com|9843756827
vignesh93.05@gmail.com|9791037091
blackydarkness96@gmail.com|9361604653
abinath007@gmail.com|9952976246
vinodkrishna.sdc@saveetha.com|9884589410
romansathish03@gmail.com|6379327409
tamilselvanb14@gmail.com|9710036489
khalidhussain995@gmail.com|6383650850
srivinish39@gmail.com|9789662048
kuldeepjain340@gmail.com|7010000267
maadheshvarp@gmail.com|9962961906
aakaashvyas@gmail.com|8870569785
j.sharonraja@gmail.com|9994810528
suriya221200@gmail.com|8110026043
suryasprinter2603@gmail.com|8056163261
mahendiran.rs@gmail.com|9710728081
hemadvazir@gmail.com|8438311008
logeshgcp@gmail.com|9994619490
yuvraj632@gmail.com|9962931627
abdullahdollars@gmail.com|7358663937
sengalvarayan21@gmail.com|9123528157
rs.mano1973@gmail.com|6369097613
dd9124396@gmail.com|9150857498
jedhibarankl@gmail.com|8668198048
sureshmicroarts@gmail.com|9894567436
yvvirale1807@gmail.com|7871467782
raj229388@gmail.com|8248456685
princeimmanuelraja@gmail.com|8148245505
victorrajkumar91@gmail.com|9176713251
ratheeshr7499@gmail.com|8754408072
darrankathir@gmail.com|9176820222
vivek.ashok1909@gmail.com|9500002636
ananthmca1993@yahoo.com|8015162389
praveenduez@gmail.com|8248324308
udhayasekar92@gmail.com|9629387725
kamalkarna25052006@gmail.com|8838869329
chantilocal959@gmail.com|9182236263
prasanth05012002@gmail.com|9360692426
abusbravos@gmail.com|6380470757
militarymittu@gmail.com|7893764026
ebijan22@gmail.com|8124405412
santhosharul2111@gmail.com|8124141957
reka4253@gmail.com|9444937953
ramavathgopikrishna9@gmail.com|9959164457
prad14277@gmail.com|9940614277
andrewfranklinaf2@gmail.com|8939588510
mahdee08@gmail.com|9944944655
kushal.kool34@gmail.com|8667048772
jalu.deen28@gmail.com|9787393959
ahmadsmart003@gmail.com|9698294418
mehu008@gmail.com|8428875059
mail@vinodvsharma.com|9600177777
manikskdk19@gmail.com|9025212801
goldindiaforex@gmail.com|9043636856
yogesbrendan424@gmail.com|9655237950
stevesamuel23@gmail.com|9790721503
www.waltervetrivelcsk1992@gmail.com|8754872750
pugazh061208@gmail.com|7530000584
suryasaravanan232@gmail.com|9345669508
suriyavinoth35@gmail.com|9344516219
yuva72728@gmail.com|9344831870
abishek222k@gmail.com|9360411341
mohammedroshan921@gmail.com|9629113302
sangeethamurali82099@gmail.com|7092326327
sharanmirthi@gmail.com|9080306358
cricket2303life@gmail.com|8637659831
saravana1599w@gmail.com|8939224597
mdwahidansari966@gmail.com|9973649309
srinathansri540@gmail.com|8925403872
romeorahul172@gmail.com|8939127109
mayakkannimariyappan@gmail.com|9345171832
safarmohamed23@gmail.com|7867993945
meerasahibmohideen@gmail.com|9500157479
ss.sanjivee32012@gmail.com|9600312409
packiaramesh@gmail.com|9787297118
vijisach@gmail.com|9865687988
ragul2465@gmail.com|9894637808
rajesh.mk7@gmail.com|9551959420
sabarisekar2111@gmail.com|9965998020
gopired08@gmail.com|7708247402
vinothalegion@gmail.com|9840997978
sidarthkaul113@gmail.com|6383304815
jnatarajan29491@gmail.com|9940533865
barathkb1@gmail.com|9025361119
deepakvenugopal1998@gmail.com|7358549893
muthupandi30042002@gmail.com|6382341303
paruajay@icloud.com|9442479598`;

async function auditRegistrations() {
    console.log("Auditing matches in player_registrations...");

    // 1. Parse targets
    const targets = PLAYERS_LIST.trim().split('\n').map(l => {
        const [email, phone] = l.split('|');
        return { email: email.trim().toLowerCase(), phone: phone.trim().replace(/[^0-9]/g, '') };
    });

    // 2. Fetch all registrations (base table)
    // Be careful with volume, but 900 is fine.
    const { data: regs, error } = await supabase
        .from('player_registrations')
        .select('id, email, phone');

    if (error) { console.error(error); return; }

    console.log(`Base Registrations: ${regs.length}`);

    let matched = 0;

    for (const t of targets) {
        const found = regs.find(r => {
            const rPhone = r.phone ? r.phone.replace(/[^0-9]/g, '') : '';
            return (r.email && r.email.toLowerCase() === t.email) ||
                (rPhone && rPhone.includes(t.phone));
        });

        if (found) {
            matched++;
        }
    }

    console.log(`Total Matched in Base Registrations: ${matched}`);
}

auditRegistrations();
