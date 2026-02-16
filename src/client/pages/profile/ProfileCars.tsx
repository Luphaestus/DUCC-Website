import { createSignal, createResource, Show, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import Panel from "@/components/Panel";
import {
    FaSolidCar, FaSolidPlus, FaSolidPenToSquare, FaSolidXmark
} from 'solid-icons/fa';
import { showConfirmModal } from "@/utils/modal";
import { Car } from "./types";
import { useProfile } from "./ProfileLayout";

export default function ProfileCars() {
    const { notify } = useNotifications();
    const context = useProfile();
    const profile = () => context?.profile();

    const [cars, { refetch: refetchCars }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/cars');
        return (res.data || []) as Car[];
    });

    const [isCarModalOpen, setIsCarModalOpen] = createSignal(false);
    const [editingCar, setEditingCar] = createSignal<Car | null>(null);

    const handleOpenCarModal = (car: Car | null = null) => {
        setEditingCar(car);
        setIsCarModalOpen(true);
    };

    const handleSaveCar = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = {
            name: formData.get('name') as string,
            seats: parseInt(formData.get('seats') as string),
            boats: parseInt(formData.get('boats') as string),
            isGlobal: formData.get('isGlobal') === 'on'
        };

        try {
            if (editingCar()) {
                await apiRequest('PUT', `/api/cars/${editingCar()!.id}`, data);
                notify('Success', 'Vehicle updated.', 'success', 3000, 'vehicle-action');
            } else {
                await apiRequest('POST', '/api/cars', data);
                notify('Success', 'Vehicle added.', 'success', 3000, 'vehicle-action');
            }
            setIsCarModalOpen(false);
            refetchCars();
        } catch (err: any) {
            notify('Error', err.message, 'error', 5000, 'vehicle-action');
        }
    };

    const handleDeleteCar = async (id: number) => {
        if (await showConfirmModal('Remove Car?', 'Are you sure you want to remove this vehicle?')) {
            notify('Info', 'Removing vehicle...', 'info', 5000, 'vehicle-action');
            try {
                await apiRequest('DELETE', `/api/cars/${id}`);
                notify('Success', 'Car removed.', 'success', 3000, 'vehicle-action');
                refetchCars();
            } catch (err: any) {
                notify('Error', err.message, 'error', 5000, 'vehicle-action');
            }
        }
    };

    return (
        <Show when={profile()} fallback={<p aria-busy="true">Loading...</p>}>
            <section class="dashboard-section active">
                <Panel
                    title="My Vehicles"
                    icon={FaSolidCar}
                    class="glass-panel"
                    action={
                        <button class="small-btn primary" onClick={() => handleOpenCarModal()}>
                            <FaSolidPlus /> Add Car
                        </button>
                    }
                >
                    <div class="item-list">
                        <For each={cars()} fallback={<p>No cars found.</p>}>
                            {(car) => (
                                <div class="list-item">
                                    <div class="item-icon"><FaSolidCar /></div>
                                    <div class="item-details">
                                        <span class="item-title">{car.name}</span>
                                        <span class="item-subtitle">{car.seats} Seats • {car.boats} Boats {car.is_global && <span class="badge primary">Global</span>}</span>
                                    </div>
                                    <div class="item-value-group">
                                        <div class="button-group">
                                            <button class="small-btn icon-only secondary" onClick={() => handleOpenCarModal(car)} title="Edit Car">
                                                <FaSolidPenToSquare />
                                            </button>
                                            <button class="small-btn icon-only delete" onClick={() => handleDeleteCar(car.id)} title="Remove Car">
                                                <FaSolidXmark />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Panel>
            </section>

            <Modal
                isOpen={isCarModalOpen()}
                title={editingCar() ? 'Edit Vehicle' : 'Add New Vehicle'}
                onClose={() => setIsCarModalOpen(false)}
            >
                <form onSubmit={handleSaveCar} class="modern-form">
                    <label>Car Name
                        <input name="name" type="text" value={editingCar()?.name || ''} required />
                    </label>
                    <div class="grid">
                        <label>Seats
                            <input name="seats" type="number" value={editingCar()?.seats || 5} min="1" required />
                        </label>
                        <label>Boats
                            <input name="boats" type="number" value={editingCar()?.boats || 0} min="0" required />
                        </label>
                    </div>
                    <Show when={profile()?.permissions?.includes('car.manage_global')}>
                        <label>
                            <input name="isGlobal" type="checkbox" checked={editingCar()?.is_global} /> Global
                        </label>
                    </Show>
                    <button type="submit" class="primary full-width">Save Vehicle</button>
                </form>
            </Modal>
        </Show>
    );
}
