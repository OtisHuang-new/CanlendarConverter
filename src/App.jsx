import { useState } from 'react';

function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [content, setContent] = useState("");
    const [startDate, setStartDate] = useState("2025-01-01");
    const [endDate, setEndDate] = useState("2025-01-01");
    const start_line = "Lịch Học";
    const end_line = "Danh sách môn học đã đăng ký";
    const mapping = { "T2": "MO", "T3": "TU", "T4": "WE", "T5": "TH", "T6": "FR", "T7": "SA", "CN": "SU" };
    const convert = { "T2": 1, "T3": 2, "T4": 3, "T5": 4, "T6": 5, "T7": 6, "CN": 0 };
    
    const handleSplit = () => {
        if (!content || typeof content.split !== 'function') {
            throw new Error("Dữ liệu không đúng chuẩn");
          }
        
        const lines = content?.split('\n') || [];
        let startIdx = -1;
        for(let i = 0; i < lines.length; i++){
            if(lines[i] === start_line){
                startIdx = i;
                break;
            }
        }
        if(startIdx === -1){
            throw new Error("Dữ liệu không đúng chuẩn");
        }else if(startIdx === lines.length - 1){
            throw new Error("Không có Dữ liệu lịch thi");
        }        
        startIdx++;

        return {'lines': lines, 'startIdx': startIdx};
    }
    const createCalendarToFile = () => {
        try{
            if(startDate > endDate) throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ");
            const splited = handleSplit();
            const lines = splited.lines;
            let startIdx = splited.startIdx;
            let myCalendar = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MyReactApp//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nX-WR-CALNAME:${"Học kỳ " + lines[startIdx - 9] + " - Năm " + lines[startIdx - 11]}\nX-WR-TIMEZONE:Asia/Ho_Chi_Minh\n`;
            const fileName = `${"HK" + lines[startIdx - 9] + "_" + lines[startIdx - 11]}`;

            while(lines[startIdx] !== end_line && startIdx < lines.length){
                const line = lines[startIdx].split('\t');


                let myEvent   = `BEGIN:VEVENT\n`
                                + `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}\n`
                                + `LOCATION:\n`
                                + `STATUS:CONFIRMED\n`;

                const converter = (period, startChar, endChar) => {
                    if(period === "") return "00:00:00";
                    const start = period.indexOf(startChar);
                    const end = period.indexOf(endChar, start + 1);
                    if (start === -1 || end === -1) return "00:00:00";
                
                    const time = period.slice(start + startChar.length, end);
                    let n = 0;
                    const hourPerperiod = 0.8;
                    if(Number(time) <= 5)
                        n = 7.5 + (Number(time) - 1) * hourPerperiod + (startChar === '-' ? hourPerperiod : 0);
                    else 
                        n = 12.667 + (Number(time) - 6) * hourPerperiod + (startChar === '-' ? hourPerperiod : 0);

                    let res = "";
                    let i = parseInt(n);
                    res += String(i).padStart(2,'0') + ":";
                    n -= i;
                    i = parseInt(n*60);
                    res += String(i).padStart(2, '0') + ":00+07:00";
                    return res;
                };
                
                const st = new Date(startDate);
                for(let i = 0; i < 7; i++){
                    if (st.getDay() === convert[line[4].split("(")[0]] || line[4] === "") { 
                        break;
                    }
                    st.setDate(st.getDate() + 1);
                }

                // const st = new Date(startDate);
                // for(let i = 0; i < 7; i++){
                //     if (st.getDay() === convert[line[4].split("(")[0]] || line[4] === "") { 
                //         break;
                //     }
                //     st.setDate(st.getDate() + 1);
                // }

                myEvent +=`UID:TH${line[0]}@myCalendar.com\n`
                        +`SUMMARY:${line[1]}\n`
                        +`DESCRIPTION:Mã môn học: ${line[0]}\\nPhòng: ${line[4] !== "" ? line[4].split("-")[2] : ""}\\nLớp/nhóm: ${line[2]}\\nLoại: ${line[3]}\n`
                        +`DTSTART:${new Date(`${st.toISOString().split("T")[0]}T${converter(line[4].substring(2, line[4].indexOf(")")+1),'(','-')}`).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}\n`
                        +`DTEND:${new Date(`${st.toISOString().split("T")[0]}T${converter(line[4].substring(2, line[4].indexOf(")")+1),'-',')')}`).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}\n`
                        +`RRULE:FREQ=WEEKLY;UNTIL=${new Date(`${endDate}T23:59:00+07:00`).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"};BYDAY=${mapping[line[4].split("(")[0]] || "MO"}\n`
                        +`END:VEVENT\n`;
                console.log(new Date(`${st.toISOString().split("T")[0]}T${converter(line[4].substring(2, line[4].indexOf(")")+1),'(','-')}`).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z");
                myCalendar += myEvent;
                startIdx++;
            }
            myCalendar += "END:VCALENDAR";
            console.log(myCalendar);

            
            const blob = new Blob([myCalendar], { type: "text/calendar;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }catch(error){
            alert(error);
        };
    }
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const SCOPES = "https://www.googleapis.com/auth/calendar";
    const [accessToken, setAccessToken] = useState(null);
    const [status, setStatus] = useState("Chưa kết nối");
    // Hàm kích hoạt đăng nhập OAuth2
    const handleConnect = () => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse) => {
            if (tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
              setStatus("Đã kết nối thành công!");
            }
          },
        });
        client.requestAccessToken();
    };
    const createNewCalendarAndEvent = async () => {
      if (!accessToken) return alert("Vui lòng kết nối Google trước!");
      setIsLoading(true);
      try {
        if(startDate > endDate) throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ");
        const splited = handleSplit();
        const lines = splited.lines;
        let startIdx = splited.startIdx;

        // Create new Calendar
        const createCalRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            'summary': `${"HK" + lines[startIdx - 9] + "_" + lines[startIdx - 11]}`,
            'timeZone': 'Asia/Ho_Chi_Minh'
          })
        });

        const newCalendar = await createCalRes.json();
        const newCalendarId = newCalendar.id; 
        // Create Events
        let check = true;
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        while(lines[startIdx] !== end_line && startIdx < lines.length){
            const line = lines[startIdx].split('\t');

            const converter = (period, startChar, endChar) => {
                if(period === "") return "00:00:00";
                const start = period.indexOf(startChar);
                const end = period.indexOf(endChar, start + 1);
                if (start === -1 || end === -1) return "00:00:00";

                const time = period.slice(start + startChar.length, end);
                let n = 0;
                const hourPerperiod = 0.75;
                if(Number(time) <= 5)
                    n = 7.5 + (Number(time) - 1) * hourPerperiod + (startChar === '-' ? hourPerperiod : 0);
                else 
                    n = 12.667 + (Number(time) - 6) * hourPerperiod + (startChar === '-' ? hourPerperiod : 0);

                let res = "";
                let i = parseInt(n);
                res += String(i).padStart(2,'0') + ":";
                n -= i;
                i = parseInt(n*60);
                res += String(i).padStart(2, '0') + ":00+07:00";
                return res;
            };
            
            const st = new Date(startDate);
            for(let i = 0; i < 7; i++){
                if (st.getDay() === convert[line[4].split("(")[0]] || line[4] === "") { 
                    break;
                }
                st.setDate(st.getDate() + 1);
            }
            const event = {
                'summary': `${line[1]}`,
                'description': `Mã môn học: ${line[0]}\\nPhòng: ${line[4] !== "" ? line[4].split("-")[2] : ""}\\nLớp/nhóm: ${line[2]}\\nLoại: ${line[3]}`,
                'start': {
                    'dateTime': `${st.toISOString().split("T")[0]}T${converter(line[4].substring(2, line[4].indexOf(")")+1),'(','-')}`,
                    'timeZone': 'Asia/Ho_Chi_Minh'
                },
                'end': {
                    'dateTime': `${st.toISOString().split("T")[0]}T${converter(line[4].substring(2, line[4].indexOf(")")+1),'-',')')}`,
                    'timeZone': 'Asia/Ho_Chi_Minh'
                },
                'recurrence': [
                    `RRULE:FREQ=WEEKLY;UNTIL=${endDate.replace(/-/g, "")}T165959Z;BYDAY=${mapping[line[4].split("(")[0]] || "MO"}`
                ]
                };

            // console.log(event);
            
            const addEventRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${newCalendarId}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
            });
            await delay(2000);
            if(check) check = addEventRes.ok;
            startIdx++;
        }
        
        if(check)
            alert("Đã thêm lịch");
        else 
            alert("Thêm lịch không thành công");
      } catch (error) {
            alert(error);
      } finally {
            setIsLoading(false);
      }
    };
    return (
        <>
        <div className="flex h-screen items-center justify-center bg-gray-100 gap-6">
            <div className="w-[400px] bg-white p-4 shadow-lg rounded-lg">
                <div className="flex flex-col gap-2">
                    <label className="font-bold">Chọn ngày bắt đầu học kỳ:</label>
                    <input 
                    type="date" 
                    className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="font-bold">Chọn ngày kết thúc học kỳ:</label>
                    <input 
                    type="date" 
                    className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <label className="font-bold">
                    Thời khóa biểu của bạn:
                </label>
                
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)} 
                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ctrl+A và dán toàn bộ thời khóa biểu vào đây"
                ></textarea>
                
                <button 
                    className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition" 
                    onClick={createCalendarToFile}
                >
                    Tải xuống thời khóa biểu
                </button>
                <div className='p-[20px] items-center'>
                    <p>Trạng thái: <strong>{status}</strong></p>
                    
                    {!accessToken ? (
                        <button className="w-full px-[20px] py-[10px] text-[16px] cursor-pointer bg-[#4285F4] text-white border-none rounded-[5px] hover:bg-[#357ae8] transition-colors" onClick={handleConnect}>
                            Kết nối với Google
                        </button>
                    ) : (
                        <button 
                            className={`w-full px-[20px] py-[10px] text-[16px] ${isLoading ? "bg-gray-300 cursor-not-allowed" : "bg-[#28a745] cursor-pointer hover:bg-[#357ae8]"} text-white border-none rounded-[5px] transition-colors`}
                            onClick={createNewCalendarAndEvent}
                            disabled={isLoading}
                        >
                            {isLoading ? (<> Đang xử lý ... </>) : (<>Thêm vào <strong>Google Calendar</strong></>)}
                        </button>
                    )}
                </div>  
            </div>
        </div>
        </>
    );
}
export default App;
