import { useState } from "react";
import type { SubmitEvent } from "react";
import { User, type Board } from "../../board";
import Modal from "../../board/components/Modal";
import { api } from "../../board/api";
import { getToken, getStoredUser } from "../../board/user";

interface Props {
    user: User;
    onClose: () => void;
}

export default function CreateModal({user, onClose}: Props) {
    const [title, setTitle] = useState('');
    const [isSubmitting, setSubmitted] = useState(false);
    

    const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
        
        // e.preventDefault();
        const trimmedTitle = title.trim();
        if(!user || !trimmedTitle || isSubmitting) return;
        try{
            const board = await api.createBoard(trimmedTitle);
            setTitle('');
            onClose();
            // window.location.href = `/board/${board.board._id}`;
        }catch (error) {
            console.error('Failed to create', error);
        }finally{
            setSubmitted(false);
        }
    };

    return (
        <Modal
        title="Create board"
        onClose={onClose}
        footer= {
            <>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                    Close
                </button>
                <button 
                type="submit"
                form="create-board"
                className="btn btn-primary btn-sm"
                disabled={!title.trim() || isSubmitting}
                >
                    {isSubmitting ? 'Creating...' : 'Create'}
                </button>
            </>
        }>

            <form onSubmit={save} id="create-board">
                <div className="mb-3">
                    <input 
                    type="text"
                    id="pb-board-title"
                    className="form-control"
                    value={title}
                    maxLength={80}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter New Board Title"
                    autoFocus
                    required
                    />
                </div>
            </form>
        </Modal>
    );
}