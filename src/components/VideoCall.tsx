'use cient'

import { useSocket } from "../../context/SocketContext";
import VideoContainer from "./VideoContainer";

const VideoCall = () => {
    const {localStream} = useSocket()
    return ( <div>
        {localStream && <VideoContainer stream={localStream} isLocalStream={true} isOnCall={false}/>}
    </div> );
}
 
export default VideoCall;