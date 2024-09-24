"use client";
import { useUser } from "@clerk/nextjs";
import { useSocket } from "../../context/SocketContext";

const ListOnlineUsers = () => {
  const { user } = useUser();
  const { onlineUsers } = useSocket();

  return (
    <div>
      {onlineUsers &&
        onlineUsers.map((onlineUser) => {
          return <div></div>;
        })}
    </div>
  );
};

export default ListOnlineUsers;
